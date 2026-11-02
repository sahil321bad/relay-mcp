import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function Favorites() {
  return (
    <div>
      <h1 className="page-title">Favorites</h1>
      <div className="card">
        <EmptyState title="No favorites yet" subtitle="Star the automations you use most to pin them here."
          action={<Link to="/automations" className="btn btn-primary">Browse automations</Link>} />
      </div>
    </div>
  );
}
