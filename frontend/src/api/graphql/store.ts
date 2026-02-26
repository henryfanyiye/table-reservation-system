import { gql } from '@/api/graphql';

export const GET_STORES = gql`
  query GetStores {
    stores {
      id
      name
      address
      phone
      description
      tableConfig {
        id
        name
        seats
        count
      }
      timeSlotConfig {
        id
        name
        startTime
        endTime
        enabled
      }
      bookingRules {
        minDaysAdvance
        maxDaysAdvance
      }
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_STORE_CONFIG = gql`
  mutation UpdateStoreConfig($storeId: String, $input: UpdateStoreConfigInput!) {
    updateStoreConfig(storeId: $storeId, input: $input) {
      id
      name
      address
      phone
      description
      tableConfig {
        id
        name
        seats
        count
      }
      timeSlotConfig {
        id
        name
        startTime
        endTime
        enabled
      }
      bookingRules {
        minDaysAdvance
        maxDaysAdvance
      }
    }
  }
`;
