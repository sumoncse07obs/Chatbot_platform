import { Navigate, Route, Routes } from 'react-router-dom';
import MediaLibrary from '@/components/shared/media/medialibrary';

export default function MediaRoutes() {
  return (
    <Routes>
      <Route index element={<MediaLibrary />} />
      <Route path="library" element={<MediaLibrary />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
