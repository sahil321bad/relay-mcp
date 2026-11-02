import { EmptyState } from '../components/ui';

export default function Folders() {
  return (
    <div>
      <h1 className="page-title">Folders</h1>
      <div className="card">
        <EmptyState title="No folders yet" subtitle="Group your automations into folders to keep things organized."
          action={<button className="btn btn-primary" onClick={() => alert('New folder (demo)')}>+ New folder</button>} />
      </div>
    </div>
  );
}
