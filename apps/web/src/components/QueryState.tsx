import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { ErrorNotice } from './ErrorNotice.tsx';
import { LoadingBar } from './LoadingBar.tsx';

interface QueryStateProps<T> {
  readonly query: UseQueryResult<T>;
  readonly children: (data: T) => ReactNode;
  readonly loadingLabel?: string;
}

/** Loading, error and success of one request, the same way on every screen. */
export function QueryState<T>({ query, children, loadingLabel }: QueryStateProps<T>) {
  if (query.isSuccess) {
    return children(query.data);
  }
  if (query.isError) {
    return (
      <ErrorNotice
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  return loadingLabel === undefined ? <LoadingBar /> : <LoadingBar label={loadingLabel} />;
}
