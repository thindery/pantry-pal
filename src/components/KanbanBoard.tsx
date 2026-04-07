// TASK-046: Kanban quick status/assign
import React, { useState } from 'react';
import type { Activity } from '../types';

type ActivityStatus = 'todo' | 'in_progress' | 'review' | 'done';

interface KanbanColumn {
  id: ActivityStatus;
  title: string;
  activities: Activity[];
}

interface KanbanBoardProps {
  activities: Activity[];
  onStatusChange: (activityId: string, newStatus: ActivityStatus) => void;
  onAssigneeChange: (activityId: string, assigneeId: string | null) => void;
  users: { id: string; name: string; avatar: string }[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  activities,
  onStatusChange,
  onAssigneeChange,
  users
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showQuickAssign, setShowQuickAssign] = useState<string | null>(null);

  const columns: KanbanColumn[] = [
    { id: 'todo', title: 'To Do', activities: activities.filter(a => a.status === 'todo') },
    { id: 'in_progress', title: 'In Progress', activities: activities.filter(a => a.status === 'in_progress') },
    { id: 'review', title: 'Review', activities: activities.filter(a => a.status === 'review') },
    { id: 'done', title: 'Done', activities: activities.filter(a => a.status === 'done') }
  ];

  const handleDragStart = (e: React.DragEvent, activityId: string) => {
    setDraggingId(activityId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: ActivityStatus) => {
    e.preventDefault();
    if (draggingId) {
      onStatusChange(draggingId, status);
      setDraggingId(null);
    }
  };

  return (
    <div className="kanban-board" style={{ display: 'flex', gap: '16px' }}>
      {columns.map(column => (
        <div
          key={column.id}
          className="kanban-column"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, column.id)}
          style={{
            flex: 1,
            background: '#f3f4f6',
            borderRadius: '8px',
            padding: '12px',
            minHeight: '400px'
          }}
        >
          <h3>{column.title} ({column.activities.length})</h3>
          {column.activities.map(activity => (
            <div
              key={activity.id}
              draggable
              onDragStart={(e) => handleDragStart(e, activity.id)}
              className="kanban-card"
              style={{
                background: 'white',
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '4px',
                cursor: 'grab',
                boxShadow: draggingId === activity.id ? '0 4px 8px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <div>{activity.name}</div>
              
              {/* Quick Assign Button */}
              <div style={{ marginTop: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setShowQuickAssign(
                    showQuickAssign === activity.id ? null : activity.id
                  )}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  {activity.assigneeId ? 'Reassign' : 'Assign'}
                </button>
                
                {activity.assigneeId && (
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {users.find(u => u.id === activity.assigneeId)?.name || 'Unknown'}
                  </span>
                )}
              </div>
              
              {/* Quick Assign Dropdown */}
              {showQuickAssign === activity.id && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>
                  <select
                    onChange={(e) => {
                      onAssigneeChange(activity.id, e.target.value || null);
                      setShowQuickAssign(null);
                    }}
                    defaultValue={activity.assigneeId || ''}
                  >
                    <option value="">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Quick Status Menu */}
              <div style={{ marginTop: '8px' }}>
                <select
                  value={activity.status}
                  onChange={(e) => onStatusChange(activity.id, e.target.value as ActivityStatus)}
                  style={{ fontSize: '12px', padding: '4px' }}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
