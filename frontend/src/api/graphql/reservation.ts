import { gql } from '@/api/graphql';

// GraphQL Queries

export const GET_RESERVATIONS = gql`
  query GetReservations($query: ReservationQueryInput, $pagination: CommonPaginationInput) {
    reservations(query: $query, pagination: $pagination) {
      data {
        id
        userId
        customer {
          name
          phone
          email
        }
        reservationDate
        storeId
        storeName
        timeSlot
        timeSlotName
        tableConfigId
        tableConfigName
        status
        specialRequests
        estimatedArrivalTime
        confirmedAt
        confirmedBy
        completedAt
        cancelledAt
        cancelReason
        createdAt
        updatedAt
      }
      pageInfo {
        total
        page
        limit
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

// GraphQL Mutations
export const CREATE_RESERVATION = gql`
  mutation CreateReservation($input: CreateReservationInput!) {
    createReservation(input: $input) {
      id
      customer {
        name
        phone
        email
      }
      reservationDate
      storeId
      storeName
      timeSlot
      tableConfigId
      tableConfigName
      status
      specialRequests
      estimatedArrivalTime
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_RESERVATION_STATUS = gql`
  mutation UpdateReservationStatus($input: UpdateReservationStatusInput!) {
    updateReservationStatus(input: $input) {
      id
      customer {
        name
        phone
        email
      }
      reservationDate
      timeSlot
      tableSize
      tableConfigId
      status
      specialRequests
      estimatedArrivalTime
      confirmedAt
      confirmedBy
      completedAt
      cancelledAt
      cancelReason
      storeId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_RESERVATION = gql`
  mutation UpdateReservation($input: UpdateReservationInput!) {
    updateReservation(input: $input) {
      id
      customer {
        name
        phone
        email
      }
      reservationDate
      timeSlot
      timeSlotName
      tableSize
      tableConfigId
      status
      specialRequests
      estimatedArrivalTime
      storeId
      storeName
      createdAt
      updatedAt
    }
  }
`;
