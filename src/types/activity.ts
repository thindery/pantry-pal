export type ActivityStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface Activity {
  id: string;
  name: string;
  description?: string;
  status: ActivityStatus;
  assigneeId?: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityType {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: string;
}

export interface ActivityFilters {
  sort: 'date' | 'name' | 'status';
  order: 'asc' | 'desc';
}
