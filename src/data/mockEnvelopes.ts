import { type Envelope } from '../types/envelope';

export const mockEnvelopes: Envelope[] = [
  {
    id: '1',
    name: 'PEA',
    targetAmount: 50000,
    currentAmount: 18400,
    allocationPercentage: 40,
  },
  {
    id: '2',
    name: 'Assurance vie',
    targetAmount: 30000,
    currentAmount: 12750,
    allocationPercentage: 30,
  },
  {
    id: '3',
    name: 'Épargne de sécurité',
    targetAmount: 10000,
    currentAmount: 8200,
    allocationPercentage: 20,
  },
  {
    id: '4',
    name: 'Crypto',
    targetAmount: 5000,
    currentAmount: 950,
    allocationPercentage: 10,
  },
];