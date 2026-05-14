'use client';

import { useUserList } from '../../remote/services/user/user.queries';

export default function UsersPage() {
  const { data: users, isLoading, isError } = useUserList();

  return (
    <div>
      <h1>Users (CSR + adapter)</h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        Adapter flattens <code>company.name → companyName</code> and <code>address.city → city</code>
      </p>
      {isLoading && <p>Loading…</p>}
      {isError && <p style={{ color: 'red' }}>Error</p>}
      {users && (
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
                <td style={{ padding: '8px 12px' }}><a href={`/users/${user.id}`}>{user.name}</a></td>
                <td style={{ padding: '8px 12px' }}>{user.email}</td>
                <td style={{ padding: '8px 12px' }}>{user.companyName}</td>
                <td style={{ padding: '8px 12px' }}>{user.city}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
