import { Navigate, Route, Routes } from 'react-router-dom';
import ListUser from '@/components/admin/module/user/listuser';
import NewUser from '@/components/admin/module/user/newuser';
import EditUser from '@/components/admin/module/user/edituser';

export default function AdminUserRoutes() {
  return (
    <Routes>
      <Route index element={<ListUser />} />
      <Route path="list" element={<ListUser />} />
      <Route path="new" element={<NewUser />} />
      <Route path="edit/:id" element={<EditUser />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
