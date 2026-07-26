import { FormEvent, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getAuthUser } from '@/api/auth/auth';
import type { AuthUser } from '@/types';
import {
  changeProfilePassword,
  getProfile,
  updateProfile,
  type UpdateProfilePayload,
} from '@/components/customer/module/profile/api/userapi';
import { useToast } from '@/components/shared/toast/ToastProvider';

type ProfileSection = 'personal' | 'password' | 'meta' | 'ai';

type ProfileForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar: string;
  country: string;
  city: string;
  state: string;
  zip: string;
  address: string;
  company_name: string;
  website: string;
  bio: string;
  system_prompt: string;
  openai_api_key: string;
};

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

const textareaClass =
  'mt-2 min-h-[120px] w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

function getUserField(user: AuthUser | null, key: keyof ProfileForm): string {
  if (!user) return '';

  const value = user[key as keyof AuthUser];
  return typeof value === 'string' ? value : '';
}

function buildForm(user: AuthUser | null): ProfileForm {
  return {
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: getUserField(user, 'avatar'),
    country: getUserField(user, 'country'),
    city: getUserField(user, 'city'),
    state: getUserField(user, 'state'),
    zip: getUserField(user, 'zip'),
    address: getUserField(user, 'address'),
    company_name: getUserField(user, 'company_name'),
    website: getUserField(user, 'website'),
    bio: getUserField(user, 'bio'),
    system_prompt: getUserField(user, 'system_prompt'),
    openai_api_key: '',
  };
}

function nullable(value: string) {
  return value.trim() || null;
}

export default function EditUserProfile() {
  const toast = useToast();

  const [user, setUser] = useState<AuthUser | null>(getAuthUser());
  const [form, setForm] = useState<ProfileForm>(() => buildForm(user));

  const [openSections, setOpenSections] = useState<Record<ProfileSection, boolean>>({
    personal: false,
    password: false,
    meta: false,
    ai: false,
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingAiSettings, setSavingAiSettings] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  function syncForm(nextUser: AuthUser | null) {
    setForm(buildForm(nextUser));
  }

  function toggleSection(section: ProfileSection) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function SectionHeader({
    section,
    title,
    description,
  }: {
    section: ProfileSection;
    title: string;
    description: string;
  }) {
    const isOpen = openSections[section];

    return (
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 text-left"
        onClick={() => toggleSection(section)}
      >
        <div>
          <h2 className="text-xl font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
    );
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);

        const data = await getProfile();

        setUser(data);
        syncForm(data);
      } catch (err) {
        const localUser = getAuthUser();

        setUser(localUser);
        syncForm(localUser);
        toast.error(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [toast]);

  async function saveProfile(
    payload: UpdateProfilePayload,
    message: string,
    setSaving: (value: boolean) => void,
  ) {
    try {
      setSaving(true);

      const updatedUser = await updateProfile(payload);

      setUser(updatedUser);
      syncForm(updatedUser);
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePersonal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await saveProfile(
      {
        first_name: nullable(form.first_name),
        last_name: nullable(form.last_name),
        phone: nullable(form.phone),
      },
      'Personal information updated successfully.',
      setSavingPersonal,
    );
  }

  async function handleSaveMeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await saveProfile(
      {
        avatar: nullable(form.avatar),
        country: nullable(form.country),
        city: nullable(form.city),
        state: nullable(form.state),
        zip: nullable(form.zip),
        address: nullable(form.address),
        company_name: nullable(form.company_name),
        website: nullable(form.website),
        bio: nullable(form.bio),
      },
      'Meta information updated successfully.',
      setSavingMeta,
    );
  }

  async function handleSaveAiSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: UpdateProfilePayload = {
      system_prompt: nullable(form.system_prompt),
    };

    if (form.openai_api_key.trim()) {
      payload.openai_api_key = form.openai_api_key.trim();
    }

    await saveProfile(
      payload,
      'AI settings updated successfully.',
      setSavingAiSettings,
    );
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    try {
      setChangingPassword(true);

      await changeProfilePassword({
        new_password: newPassword,
      });

      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="py-6 text-center text-slate-500">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="grid w-full grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,420px)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader
              section="personal"
              title="Personal Information"
              description="Update your basic profile and contact details."
            />

            {openSections.personal && (
              <form className="mt-6 space-y-6" onSubmit={handleSavePersonal}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    First Name
                    <input
                      className={inputClass}
                      value={form.first_name}
                      onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                      placeholder="First name"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900">
                    Last Name
                    <input
                      className={inputClass}
                      value={form.last_name}
                      onChange={(event) => setForm({ ...form, last_name: event.target.value })}
                      placeholder="Last name"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900">
                    Email
                    <input
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                      value={form.email}
                      disabled
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900">
                    Phone
                    <input
                      className={inputClass}
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                      placeholder="Phone number"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    onClick={() => syncForm(user)}
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={savingPersonal}
                  >
                    {savingPersonal ? 'Saving...' : 'Save Personal'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader
              section="meta"
              title="Meta Information"
              description="Optional company, location, avatar, and bio details."
            />

            {openSections.meta && (
              <form className="mt-6 space-y-6" onSubmit={handleSaveMeta}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Company Name
                    <input
                      className={inputClass}
                      value={form.company_name}
                      onChange={(event) => setForm({ ...form, company_name: event.target.value })}
                      placeholder="Company name"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900">
                    Website
                    <input
                      className={inputClass}
                      value={form.website}
                      onChange={(event) => setForm({ ...form, website: event.target.value })}
                      placeholder="https://example.com"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900">
                    Country
                    <input
                      className={inputClass}
                      value={form.country}
                      onChange={(event) => setForm({ ...form, country: event.target.value })}
                      placeholder="Country"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900">
                    State
                    <input
                      className={inputClass}
                      value={form.state}
                      onChange={(event) => setForm({ ...form, state: event.target.value })}
                      placeholder="State"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900">
                    City
                    <input
                      className={inputClass}
                      value={form.city}
                      onChange={(event) => setForm({ ...form, city: event.target.value })}
                      placeholder="City"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900">
                    ZIP
                    <input
                      className={inputClass}
                      value={form.zip}
                      onChange={(event) => setForm({ ...form, zip: event.target.value })}
                      placeholder="ZIP code"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900 md:col-span-2">
                    Address
                    <input
                      className={inputClass}
                      value={form.address}
                      onChange={(event) => setForm({ ...form, address: event.target.value })}
                      placeholder="Address"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900 md:col-span-2">
                    Avatar URL
                    <input
                      className={inputClass}
                      value={form.avatar}
                      onChange={(event) => setForm({ ...form, avatar: event.target.value })}
                      placeholder="https://..."
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-900 md:col-span-2">
                    Bio
                    <textarea
                      className={textareaClass}
                      value={form.bio}
                      onChange={(event) => setForm({ ...form, bio: event.target.value })}
                      placeholder="Write something about yourself..."
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    onClick={() => syncForm(user)}
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={savingMeta}
                  >
                    {savingMeta ? 'Saving...' : 'Save Meta'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader
              section="ai"
              title="AI Settings"
              description="Configure your OpenAI key and default system prompt."
            />

            {openSections.ai && (
              <form className="mt-6 space-y-6" onSubmit={handleSaveAiSettings}>
                <label className="block text-sm font-semibold text-slate-900">
                  OpenAI API Key
                  <input
                    className={inputClass}
                    type="password"
                    value={form.openai_api_key}
                    onChange={(event) => setForm({ ...form, openai_api_key: event.target.value })}
                    placeholder={
                      user?.openai_api_key
                        ? 'OpenAI key is configured. Enter a new key to replace it.'
                        : 'OpenAI API key'
                    }
                    autoComplete="off"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-900">
                  System Prompt
                  <textarea
                    className="mt-2 min-h-[180px] w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    value={form.system_prompt}
                    onChange={(event) => setForm({ ...form, system_prompt: event.target.value })}
                    placeholder="Write the default instruction for this customer's assistant..."
                  />
                </label>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    onClick={() => syncForm(user)}
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={savingAiSettings}
                  >
                    {savingAiSettings ? 'Saving...' : 'Save AI Settings'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionHeader
            section="password"
            title="Change Password"
            description="Update your account password."
          />

          {openSections.password && (
            <form className="mt-6 space-y-6" onSubmit={handleChangePassword}>
              <label className="block text-sm font-semibold text-slate-900">
                New Password
                <input
                  className={inputClass}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New password"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-900">
                Confirm New Password
                <input
                  className={inputClass}
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                />
              </label>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  onClick={() => {
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={changingPassword}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}