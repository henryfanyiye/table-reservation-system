/**
 * Couchbase 初始化脚本
 *
 * 用于初始化 Couchbase bucket 的数据，包括：
 * 1. 创建 bucket
 * 2. 创建 Ottoman 所需的索引
 * 3. 创建默认管理员用户
 * 4. 创建示例门店配置
 */

const { connect } = require('couchbase');
const bcrypt = require('bcrypt');

// 配置
const config = {
  connectionString: process.env.COUCHBASE_CONNECTION_STRING ?? 'couchbase://localhost',
  username: process.env.COUCHBASE_USERNAME ?? 'Administrator',
  password: process.env.COUCHBASE_PASSWORD ?? 'password123',
  bucketName: process.env.COUCHBASE_BUCKET ?? 'table_reservation',
  bucketRamQuotaMB: Number(process.env.COUCHBASE_BUCKET_RAM_QUOTA_MB) || 256,
};

// 等待函数
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 从连接字符串提取主机
const extractHost = (connectionString) => {
  const match = connectionString.match(/couchbase:\/\/([^,]+)/);
  return match?.[1] ?? 'localhost';
};

// REST API 基础 URL
const getRestApiUrl = (host, port = 8091) => `http://${host}:${port}`;

// 等待 Couchbase Web UI 就绪
const waitForCouchbaseReady = async (host, maxRetries = 60) => {
  console.log('\n等待 Couchbase 启动...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${getRestApiUrl(host)}/ui/index.html`);
      if (response.ok) {
        console.log('✓ Couchbase Web UI 已就绪');
        return true;
      }
    } catch {
      // 忽略连接错误
    }
    console.log(`  等待中... (${i + 1}/${maxRetries})`);
    await sleep(2000);
  }

  throw new Error('Couchbase 启动超时');
};

// 创建 bucket（使用 REST API，社区版支持）
const createBucketViaRestApi = async (host, username, password, bucketName, ramQuotaMB) => {
  const url = `${getRestApiUrl(host)}/pools/default/buckets`;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  console.log(`\n检查 bucket "${bucketName}"...`);

  // 先检查 bucket 是否已存在
  try {
    const listResponse = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (listResponse.ok) {
      const buckets = await listResponse.json();
      const exists = buckets.some(b => b.name === bucketName);

      if (exists) {
        console.log(`✓ Bucket "${bucketName}" 已存在`);
        return true;
      }
    }
  } catch (error) {
    console.log(`! 获取 bucket 列表警告: ${error.message}`);
  }

  // Bucket 不存在，尝试创建
  console.log(`正在创建 bucket "${bucketName}"...`);

  const params = new URLSearchParams({
    name: bucketName,
    ramQuotaMB: String(ramQuotaMB),
    bucketType: 'couchbase',
    evictionPolicy: 'valueOnly',
    replicaIndex: '0',
    flushEnabled: '0',
  });

  try {
    const createResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (createResponse.ok) {
      console.log(`✓ Bucket "${bucketName}" 创建成功`);
      await sleep(3000);
      return true;
    }

    const errorText = await createResponse.text();
    console.log(`! Bucket 创建警告: ${createResponse.status} ${errorText}`);
    return false;
  } catch (error) {
    console.log(`! Bucket 创建警告: ${error.message}`);
    return false;
  }
};

// 连接到 Couchbase
const connectToCouchbase = async (connectionString, username, password, maxRetries = 60) => {
  console.log('\n连接到 Couchbase...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const cluster = await connect(connectionString, { username, password });
      console.log('✓ 成功连接到 Couchbase');
      return cluster;
    } catch {
      console.log(`  重试连接... (${i + 1}/${maxRetries})`);
      await sleep(2000);
    }
  }

  throw new Error('无法连接到 Couchbase');
};

// 创建 Scope 和 Collection（Ottoman v2 需要）
const createScopesAndCollections = async (bucketName) => {
  console.log('\n创建 Scope 和 Collection...');

  const host = extractHost(config.connectionString);
  const scopeName = '_default'; // Ottoman 默认使用 _default scope
  const collections = ['User', 'Store', 'Reservation'];

  // 先获取已存在的 collections
  let existingCollections = [];
  try {
    const scopesUrl = `${getRestApiUrl(host)}/pools/default/buckets/${bucketName}/scopes`;
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

    const response = await fetch(scopesUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (response.ok) {
      const data = await response.json();
      const defaultScope = data.scopes?.find(s => s.name === scopeName);
      existingCollections = defaultScope?.collections?.map(c => c.name) || [];
    }
  } catch (error) {
    console.log('! 获取现有 collections 失败:', error.message);
  }

  // 创建缺失的 collections
  for (const collectionName of collections) {
    if (existingCollections.includes(collectionName)) {
      console.log(`✓ Collection "${collectionName}" 已存在`);
      continue;
    }

    try {
      const url = `${getRestApiUrl(host)}/pools/default/buckets/${bucketName}/scopes/${scopeName}/collections`;
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ name: collectionName }),
      });

      if (response.ok) {
        console.log(`✓ Collection "${collectionName}" 创建成功`);
      } else {
        const errorText = await response.text();
        console.log(`! Collection "${collectionName}" 创建失败: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.log(`! Collection "${collectionName}" 创建异常: ${error.message}`);
    }
  }

  // 等待 collection 完全就绪
  await sleep(3000);
};

// 等待 N1QL 服务识别 bucket
const waitForN1QLReady = async (cluster, bucketName, maxRetries = 40) => {
  console.log('\n等待 N1QL 服务就绪...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      // 尝试查询目标 bucket 来验证 N1QL 是否就绪
      await cluster.query(`SELECT * FROM \`${bucketName}\`._default._default LIMIT 1`);
      console.log('✓ N1QL 服务已就绪');
      return true;
    } catch (error) {
      if (error.message?.includes('bucket not found') ||
          error.message?.includes('No bucket') ||
          error.message?.includes('namespace not found') ||
          error.code === 12003 ||
          error.code === 12016) {
        console.log(`  等待 bucket 被 N1QL 识别... (${i + 1}/${maxRetries})`);
        await sleep(2000);
      } else {
        console.log('! N1QL 查询失败:', error.message);
        await sleep(2000);
      }
    }
  }

  console.log('⚠️  N1QL 服务可能未完全就绪，但继续尝试创建索引');
  return false;
};

// 创建主索引（Ottoman 会自动创建其他索引）
const createIndexes = async (cluster, bucketName) => {
  console.log('\n创建主索引...');

  const scopeName = '_default';
  const bucketWithScope = `\`${bucketName}\`.\`${scopeName}\``;

  // 只创建主索引，Ottoman 的 ensureIndexes 会自动创建其他索引
  const collections = ['User', 'Store', 'Reservation'];

  for (const collectionName of collections) {
    try {
      await cluster.query(
        `CREATE PRIMARY INDEX IF NOT EXISTS on ${bucketWithScope}.\`${collectionName}\``
      );
      console.log(`✓ ${collectionName} 主索引创建成功`);
    } catch (error) {
      console.log(`! ${collectionName} 主索引创建警告:`, error.message);
    }
  }

  console.log('提示: Ottoman 将自动创建其他索引（如 username、phone 等）');
};

// 检查是否已初始化（通过用户名查询）
const checkInitializationStatus = async (cluster, bucketName) => {
  console.log('\n检查初始化状态...');

  try {
    // Ottoman v2 使用 collection 存储数据，查询 User collection
    const result = await cluster.query(
      `SELECT * FROM \`${bucketName}\`.\`_default\`.\`User\` WHERE username = 'admin' LIMIT 1`
    );

    if (result.rows?.length > 0) {
      console.log('✓ 数据已初始化，跳过初始化步骤');
      console.log('  提示: 如需重新初始化，请先删除管理员用户');
      return true;
    }
  } catch (error) {
    console.log('! 检查初始化状态失败:', error.message);
  }

  return false;
};

// 生成 Ottoman 兼容的文档 ID
const generateDocId = (model, prefix) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${model}::${prefix}${timestamp}${random}`;
};

// 创建默认管理员用户（与 User Model 保持一致）
const createAdminUser = async (collection) => {
  console.log('\n创建默认管理员用户...');

  const now = new Date().toISOString();
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);

  // Ottoman 使用格式: User::<generated_id>
  // 生成文档 key 并提取 ID 部分
  const docId = generateDocId('User', 'user');
  const userId = docId.split('::')[1]; // 提取 ID 部分: user123456

  // IUser 接口对应
  // 注意：Ottoman 需要 _type 字段来标识文档类型
  const adminUser = {
    id: userId,            // Ottoman 需要文档内容中有 id 字段
    _type: 'User',         // Ottoman 模型标识
    username: 'admin',
    password: adminPassword,
    name: '系统管理员',
    role: 'admin',         // UserRole: 'staff' | 'customer'
    lastLoginAt: null,     // 初始为空
    createdAt: now,
    updatedAt: now,
  };

  try {
    await collection.insert(docId, adminUser);
    console.log('✓ 默认管理员用户创建成功');
    console.log(`  文档 key: ${docId}`);
    console.log(`  用户 ID: ${userId}`);
    return docId;
  } catch (error) {
    if (error.cause === 13 || error.cause === 'key_already_exists') {
      console.log('- 管理员用户已存在');
    } else {
      throw error;
    }
  }
};

// 创建示例门店配置（与 Store Model 保持一致）
const createStoreConfig = async (collection) => {
  console.log('\n创建示例门店配置...');

  const now = new Date().toISOString();

  // Ottoman 使用格式: Store::<generated_id>
  // 生成文档 key 并提取 ID 部分
  const docId = generateDocId('Store', 'store');
  const storeId = docId.split('::')[1]; // 提取 ID 部分: store123456

  // IStore 接口对应
  // 注意：Ottoman 需要 _type 字段来标识文档类型
  const storeConfig = {
    id: storeId,           // Ottoman 需要文档内容中有 id 字段
    _type: 'Store',        // Ottoman 模型标识
    name: '希尔顿餐厅',
    address: '北京市朝阳区建国路93号',
    phone: '010-12345678',
    description: '高端西餐厅，提供正宗法式料理，环境优雅，适合商务宴请和情侣约会',
    // TimeSlotConfig[]
    timeSlotConfig: [
      { id: 'slot-lunch', name: '午餐时段', startTime: '11:00', endTime: '14:00', enabled: true },
      { id: 'slot-dinner', name: '晚餐时段', startTime: '17:00', endTime: '21:00', enabled: true },
    ],
    // TableConfig[]
    tableConfig: [
      { id: 'table-2', name: '2人桌', seats: 2, count: 10 },
      { id: 'table-4', name: '4人桌', seats: 4, count: 8 },
      { id: 'table-6', name: '6人桌', seats: 6, count: 5 },
      { id: 'table-8', name: '8人桌', seats: 8, count: 3 },
    ],
    // BookingRules
    bookingRules: {
      minDaysAdvance: 0,
      maxDaysAdvance: 30,
    },
    lastConfigUpdatedAt: now,
    lastConfigUpdatedBy: 'system',  // 添加更新者字段
    createdAt: now,
    updatedAt: now,
  };

  try {
    await collection.insert(docId, storeConfig);
    console.log('✓ 示例门店配置创建成功');
    console.log(`  文档 key: ${docId}`);
    console.log(`  门店 ID: ${storeId}`);
    return docId;
  } catch (error) {
    if (error.cause === 13 || error.cause === 'key_already_exists') {
      console.log('- 门店配置已存在');
    } else {
      throw error;
    }
  }
};

// 初始化函数
const initializeCouchbase = async () => {
  const { connectionString, username, password, bucketName, bucketRamQuotaMB } = config;
  const host = extractHost(connectionString);

  // 1. 等待 Couchbase 就绪
  await waitForCouchbaseReady(host);
  await sleep(5000);

  // 2. 创建 bucket
  const bucketCreated = await createBucketViaRestApi(host, username, password, bucketName, bucketRamQuotaMB);

  if (!bucketCreated) {
    console.log('⚠️  Bucket 创建可能失败，但继续尝试使用...');
  }

  // 3. 连接到 Couchbase
  const cluster = await connectToCouchbase(connectionString, username, password);
  const bucket = cluster.bucket(bucketName);

  // 4. 等待 bucket 就绪
  await sleep(5000);

  // 5. 等待 N1QL 服务识别 bucket
  await waitForN1QLReady(cluster, bucketName);

  // 6. 创建 Scope 和 Collection（Ottoman v2 需要）
  await createScopesAndCollections(bucketName);

  // 7. 创建所有索引（主索引 + Ottoman 所需索引）
  await createIndexes(cluster, bucketName);
  await sleep(5000);

  // 8. 检查是否已初始化
  const isInitialized = await checkInitializationStatus(cluster, bucketName);
  if (isInitialized) return;

  // 9. 创建默认数据
  console.log('开始初始化数据...');
  const scope = bucket.scope('_default');
  const userCollection = scope.collection('User');
  const storeCollection = scope.collection('Store');

  const userId = await createAdminUser(userCollection);
  const storeId = await createStoreConfig(storeCollection);

  console.log('\n✅ 初始化完成！');
  console.log(`  User ID: ${userId}`);
  console.log(`  Store ID: ${storeId}`);
};

// 执行初始化
initializeCouchbase()
  .then(() => {
    console.log('\n初始化成功完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 初始化失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
