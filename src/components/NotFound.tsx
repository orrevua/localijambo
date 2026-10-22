import { useI18n } from '../i18n/useI18n.ts';
import StateMessage from './StateMessage.tsx';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <StateMessage
      title={t.common.notFound}
      detail={t.common.notFoundDetail}
      action={{ to: '/', label: t.common.backToMap }}
    />
  );
}
