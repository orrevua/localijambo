import { isRouteErrorResponse, useRouteError } from 'react-router';
import StateMessage from './StateMessage.tsx';

export default function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    const notFound = error.status === 404;
    return (
      <div className="route-error">
        <StateMessage
          tone={notFound ? 'neutral' : 'error'}
          title={notFound ? 'Page not found' : `Something went wrong (${error.status})`}
          detail={
            notFound
              ? "That page doesn't exist. It may have moved or the link was mistyped."
              : error.statusText || 'An unexpected error occurred.'
          }
          action={{ to: '/', label: 'Back to the map' }}
        />
      </div>
    );
  }

  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
  return (
    <div className="route-error">
      <StateMessage
        tone="error"
        title="Something went wrong"
        detail={message}
        action={{ to: '/', label: 'Back to the map' }}
      />
    </div>
  );
}
