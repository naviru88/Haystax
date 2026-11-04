import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { AppShellComponent } from './app-shell.component';
import { OWNER_API } from '../../../features/owner-identity/services/owner-api.interface';
import { SupabaseAuthService } from '../../../features/owner-identity/services/supabase-auth.service';
import { OwnerUser } from '../../../features/owner-identity/models/owner-user.model';
import { environment } from '../../../../environments/environment';

const TENANT: OwnerUser = {
  id: 't', display_name: 'Rashmi Perera', email: 'rashmi@student.lk',
  is_owner: false, is_admin: false, is_suspended: false,
};
const OWNER: OwnerUser = {
  id: 'o', display_name: 'Kavinda Silva', email: 'kavinda@haystax.lk',
  is_owner: true, is_admin: false, is_suspended: false,
};

function setup(me: OwnerUser) {
  const switchUser = vi.fn();
  TestBed.configureTestingModule({
    imports: [AppShellComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      {
        provide: OWNER_API,
        useValue: {
          getMe: () => Promise.resolve(me),
          getMockSessionUser: () => me,
          switchUser,
        },
      },
      { provide: SupabaseAuthService, useValue: { signOut: () => Promise.resolve() } },
    ],
  });
  return { switchUser };
}

async function render() {
  const fixture = TestBed.createComponent(AppShellComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('AppShellComponent', () => {
  afterEach(() => { (environment as { useMockApi: boolean }).useMockApi = false; });

  it('renders the brand title', async () => {
    setup(TENANT);
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Haystax');
  });

  it('shows the signed-in user and their role instead of the Guest placeholder', async () => {
    setup(TENANT);
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Rashmi Perera');
    expect(text).toContain('Tenant');
  });

  it('hides owner and admin navigation from a tenant', async () => {
    setup(TENANT);
    const fixture = await render();
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a')
    ).map(a => a.textContent?.trim());

    expect(labels).toContain('Home');
    expect(labels).not.toContain('Owner Dashboard');
    expect(labels).not.toContain('Admin Panel');
  });

  it('shows the owner navigation to an owner but not the admin panel', async () => {
    setup(OWNER);
    const fixture = await render();
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a')
    ).map(a => a.textContent?.trim());

    expect(labels).toContain('Owner Dashboard');
    expect(labels).not.toContain('Admin Panel');
  });

  it('signs out of the mock session and returns to the login page', async () => {
    (environment as { useMockApi: boolean }).useMockApi = true;
    const { switchUser } = setup(TENANT);
    const fixture = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await fixture.componentInstance.signOut();

    expect(switchUser).toHaveBeenCalledWith('');
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
