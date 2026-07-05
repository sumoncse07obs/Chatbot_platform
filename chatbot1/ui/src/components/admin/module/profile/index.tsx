import { Navigate, Route, Routes } from 'react-router-dom';
import EditUserProfile from '@/components/admin/module/profile/edituserprofile';

export default function ProfileRoutes() {
  return (
    <Routes>
      <Route index element={<EditUserProfile />} />
      <Route path="edit" element={<EditUserProfile />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
