import { useNavigate, useParams } from 'react-router';
import StateMessage from '../../components/StateMessage.tsx';
import TreeDetail from './TreeDetail.tsx';
import { useI18n } from '../../i18n/useI18n.ts';

export default function TreeDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  if (!id) return <StateMessage title={t.detail.notFound} action={{ to: '/list', label: t.detail.backToList }} />;

  return <TreeDetail id={id} onDeleted={() => navigate('/list', { replace: true })} />;
}
