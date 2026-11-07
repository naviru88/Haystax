import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { OWNER_API } from './owner-api.interface';
import { OwnerApiService } from './owner-api.service';
import { MockAuthService } from './mock-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * D-MOCK: single place that picks the OwnerApi provider — MockAuthService when
 * environment.useMockApi is true (no network, fixture users), real OwnerApiService otherwise.
 * [AGENTS-W3 D-MOCK][AGENTS C3 adapter pattern]
 */
export function provideOwnerApi(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: OWNER_API, useClass: environment.useMockApi ? MockAuthService : OwnerApiService },
  ]);
}
