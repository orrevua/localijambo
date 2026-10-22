import { isRouteErrorResponse, useRouteError } from 'react-router';
import StateMessage from './StateMessage.tsx';
import { useI18n } from '../i18n/useI18n.ts';

export default function RouteError() {
  const error = useRouteError();
  const { t } = useI18n();

  if (isRouteErrorResponse(error)) {
    const notFound = error.status === 404;
    return (
      <div className="route-error">
        <StateMessage
          tone={notFound ? 'neutral' : 'error'}
          title={notFound ? t.common.notFound : t.common.somethingWrongStatus(error.status)}
          detail={
            notFound
              ? t.common.notFoundDetail
              : error.statusText || t.common.unexpected
          }
          action={{ to: '/', label: t.common.backToMap }}
        />
      </div>
    );
  }

  const message =
    error instanceof Error ? error.message : t.common.unexpected;
  return (
    <div className="route-error">
      <StateMessage
        tone="error"
        title={t.common.somethingWrong}
        detail={message}
        action={{ to: '/', label: t.common.backToMap }}
      />
    </div>
  );
}
