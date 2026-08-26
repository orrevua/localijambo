import { useNavigate, useParams } from 'react-router';
import StateMessage from '../../components/StateMessage.tsx';
import TreeDetail from './TreeDetail.tsx';

export default function TreeDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) return <StateMessage title="Tree not found" action={{ to: '/list', label: 'Back to list' }} />;

  return <TreeDetail id={id} onDeleted={() => navigate('/list', { replace: true })} />;
}
