import { Navigate, Route, Routes } from 'react-router-dom';
import ResourcesList from './resourceslist';

export default function AdminResourceRoutes() {
  return (
    <Routes>
      <Route index element={<ResourcesList />} />
      <Route path="list" element={<ResourcesList />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}