import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { StoreService } from '../store.service';
import { UpdateStoreConfigInput } from '@/common/dto/update-store-config.dto';
import { StoreOutput } from '@/common/dto/store-output.dto';

@Resolver('Store')
export class StoreResolver {
  constructor(private readonly storeService: StoreService) {}

  /**
   * 查询门店列表
   */
  @Query(() => [StoreOutput], { nullable: true })
  @UseGuards(JwtAuthGuard)
  async stores(): Promise<StoreOutput[]> {
    const stores = await this.storeService.getAllStores();
    return stores.map((store) => this.formatStore(store));
  }

  /**
   * 创建或更新门店配置（统一接口）
   * storeId 不传时创建新门店，传时更新现有门店
   */
  @Mutation(() => StoreOutput)
  @UseGuards(JwtAuthGuard)
  async updateStoreConfig(
    @Args('storeId', { nullable: true }) storeId: string,
    @Args('input') input: UpdateStoreConfigInput,
    @Context() context: any,
  ): Promise<StoreOutput> {
    const user = context.req?.user;

    let store;
    if (!storeId) {
      // 创建新门店
      store = await this.storeService.createStore(
        {
          name: input.name || '',
          address: input.address || '',
          phone: input.phone,
          description: input.description,
          tableConfig: input.tableConfig,
          timeSlotConfig: input.timeSlotConfig,
          bookingRules: input.bookingRules,
        },
        user?.id,
      );
    } else {
      // 更新现有门店
      store = await this.storeService.updateConfig(storeId, input, user?.id);
    }

    return this.formatStore(store);
  }

  /**
   * 格式化门店数据
   */
  private formatStore(store: any): StoreOutput {
    return {
      id: store.id || store._id || '',
      name: store.name,
      address: store.address,
      phone: store.phone,
      description: store.description,
      tableConfig: store.tableConfig,
      timeSlotConfig: store.timeSlotConfig,
      bookingRules: store.bookingRules,
      createdAt: this.toISOString(store.createdAt),
      updatedAt: this.toISOString(store.updatedAt),
    };
  }

  /**
   * 安全的日期转换函数
   */
  private toISOString(date: any): string | null {
    if (!date) return null;
    if (date instanceof Date) return date.toISOString();
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
}
