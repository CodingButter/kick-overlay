import { Outlet } from 'react-router-dom';

export function OverlayLayout() {
  // Overlay pages need overflow hidden to prevent scrollbars in OBS
  return (
    <div className="overflow-hidden">
      <Outlet />
    </div>
  );
}
