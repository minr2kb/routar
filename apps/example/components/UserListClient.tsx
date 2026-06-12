"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { userQuery } from "@/remote/services/user";

export function UserListClient() {
  // `data` is already adapted (companyName / city flattened from nested fields).
  const { data: users } = useSuspenseQuery(userQuery.getList());

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-line text-left text-muted">
          <th className="px-3 py-2 font-semibold">Name</th>
          <th className="px-3 py-2 font-semibold">Email</th>
          <th className="px-3 py-2 font-semibold">Company</th>
          <th className="px-3 py-2 font-semibold">City</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-line">
            <td className="px-3 py-2">{user.name}</td>
            <td className="px-3 py-2">{user.email}</td>
            <td className="px-3 py-2">{user.companyName}</td>
            <td className="px-3 py-2">{user.city}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
