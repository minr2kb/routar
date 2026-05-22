'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { userListQueryOptions } from '../remote/services/user/user.queries';

export function UserListClient() {
  const { data: users } = useSuspenseQuery(userListQueryOptions());

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
          <th style={{ padding: '8px 12px' }}>Name</th>
          <th style={{ padding: '8px 12px' }}>Email</th>
          <th style={{ padding: '8px 12px' }}>Company</th>
          <th style={{ padding: '8px 12px' }}>City</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '8px 12px' }}>
              <a href={`/users/${user.id}`}>{user.name}</a>
            </td>
            <td style={{ padding: '8px 12px' }}>{user.email}</td>
            <td style={{ padding: '8px 12px' }}>{user.companyName}</td>
            <td style={{ padding: '8px 12px' }}>{user.city}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
