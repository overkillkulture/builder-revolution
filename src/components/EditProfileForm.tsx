/* eslint-disable react-perf/jsx-no-new-function-as-prop */

'use client';
import { apiUrl } from '@/lib/apiUrl';

import { Controller, SubmitErrorHandler, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AtSign, Bullhorn, Profile, WorldNet } from '@/svg_components';
import { UserAboutSchema, userAboutSchema } from '@/lib/validations/userAbout';
import { useSessionUserData } from '@/hooks/useSessionUserData';
import { useSessionUserDataMutation } from '@/hooks/mutations/useSessionUserDataMutation';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GenericLoading } from './GenericLoading';
import { Textarea } from './ui/Textarea';
import Button from './ui/Button';
import { TextInput } from './ui/TextInput';

interface PortfolioEntry {
  title: string;
  url: string;
  description: string;
}

// No preset skills — let people tell us what they actually know

export function EditProfileForm({ redirectTo }: { redirectTo?: string }) {
  const [userData] = useSessionUserData();
  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioEntry[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [savingLinks, setSavingLinks] = useState(false);
  const [linksError, setLinksError] = useState('');

  const defaultValues = useMemo(
    () => ({
      username: userData?.username || userData?.id || '',
      name: userData?.name || '',
      phoneNumber: null,
      bio: userData?.bio || null,
      website: userData?.website || null,
      address: null,
      gender: null,
      relationshipStatus: null,
      birthDate: null,
      skills: (userData as any)?.skills || null,
    }),
    [userData],
  );

  const { control, handleSubmit, reset, setError, setFocus } = useForm<UserAboutSchema>({
    resolver: zodResolver(userAboutSchema),
    defaultValues,
  });
  const { updateSessionUserDataMutation } = useSessionUserDataMutation();
  const router = useRouter();

  // Parse existing skills on load
  useEffect(() => {
    if ((userData as any)?.skills) {
      setSelectedSkills((userData as any).skills.split(',').filter(Boolean));
    }
  }, [userData]);

  const toggleSkill = useCallback((skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }, []);

  const addCustomSkill = useCallback(() => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills((prev) => [...prev, customSkill.trim()]);
      setCustomSkill('');
    }
  }, [customSkill, selectedSkills]);

  const addPortfolioLink = useCallback(() => {
    setPortfolioLinks((prev) => [...prev, { title: '', url: '', description: '' }]);
  }, []);

  const updatePortfolioLink = useCallback((index: number, field: keyof PortfolioEntry, value: string) => {
    setPortfolioLinks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removePortfolioLink = useCallback((index: number) => {
    setPortfolioLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const savePortfolioLinks = useCallback(async (userId: string): Promise<boolean> => {
    const validLinks = portfolioLinks.filter((l) => l.title.trim() && l.url.trim());
    if (validLinks.length === 0) return true;

    setSavingLinks(true);
    setLinksError('');
    try {
      const res = await fetch(apiUrl(`/api/users/${userId}/portfolio`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: validLinks }),
      });
      // Was fire-and-forget: a failed save was swallowed and the user was
      // navigated away as if it worked, silently losing their links (S446).
      if (!res.ok) {
        setLinksError('Your profile saved, but your links didn’t — tap Save again.');
        return false;
      }
      return true;
    } catch (e) {
      console.error('Failed to save portfolio links', e);
      setLinksError('Your profile saved, but your links didn’t (connection) — tap Save again.');
      return false;
    } finally {
      setSavingLinks(false);
    }
  }, [portfolioLinks]);

  const onValid: SubmitHandler<UserAboutSchema> = (data) => {
    // Inject skills into the data
    const dataWithSkills = {
      ...data,
      skills: selectedSkills.length > 0 ? selectedSkills.join(',') : null,
    };

    updateSessionUserDataMutation.mutate(
      { data: dataWithSkills },
      {
        onError: (error) => {
          const { field, message } = JSON.parse(error.message) as {
            field: keyof UserAboutSchema;
            message: string;
          };
          setError(field, { message });
          setFocus(field);
        },
        onSuccess: async () => {
          // Only navigate away if the links also saved — otherwise stay so the
          // user sees the error and can retry (don't silently drop their links).
          const linksOk = userData?.id ? await savePortfolioLinks(userData.id) : true;
          if (linksOk) router.push(redirectTo || `/${data.username}`);
        },
      },
    );
  };
  // eslint-disable-next-line no-console
  const onInvalid: SubmitErrorHandler<UserAboutSchema> = (errors) => console.log(errors);
  const resetForm = useCallback(() => reset(defaultValues), [reset, defaultValues]);

  useEffect(() => {
    reset(defaultValues);
  }, [reset, defaultValues]);

  if (!userData) return <GenericLoading>Loading form</GenericLoading>;
  return (
    <div>
      <form onSubmit={handleSubmit(onValid, onInvalid)} className="flex flex-col gap-4">
        {/* ═══════ REQUIRED ═══════ */}
        <div className="rounded-lg border border-primary/20 bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-primary">Required — gets you in the door</p>
          <div className="flex flex-col gap-4">
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, ref, value }, fieldState: { error } }) => (
                <TextInput
                  label="Name *"
                  value={value}
                  onChange={(v) => onChange(v)}
                  errorMessage={error?.message}
                  ref={ref}
                  Icon={Profile}
                />
              )}
            />
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, ref, value }, fieldState: { error } }) => (
                <TextInput
                  label="Username *"
                  value={value}
                  onChange={(v) => onChange(v)}
                  errorMessage={error?.message}
                  ref={ref}
                  Icon={AtSign}
                />
              )}
            />
          </div>
        </div>

        {/* ═══════ THE BUILDER REVOLUTION ═══════ */}
        <div className="rounded-lg border border-accent/20 bg-card p-4">
          <p className="mb-1 text-sm font-semibold text-purple-400">
            The Builder Revolution
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            We list people by what they build. Answer these and we&apos;ll make sure the right people find you.
          </p>

          {/* 1. What do you build? */}
          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, ref, value }, fieldState: { error } }) => (
              <div className="mb-4">
                <Textarea
                  label="What do you build?"
                  value={value || ''}
                  onChange={(v) => onChange(v || null)}
                  errorMessage={error?.message}
                  ref={ref}
                  Icon={Bullhorn}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Houses, software, businesses, communities, legal cases, music, food — whatever it is, say it.
                </p>
              </div>
            )}
          />

          {/* 2. Why do you build it? */}
          <div className="mb-4">
            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, ref, value }, fieldState: { error } }) => (
                <Textarea
                  label="Why do you build it?"
                  value={value || ''}
                  onChange={(v) => onChange(v || null)}
                  errorMessage={error?.message}
                  ref={ref}
                  Icon={Bullhorn}
                />
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              What drives you? What problem are you solving? Who are you doing it for?
            </p>
          </div>

          {/* 3. How long have you been building? */}
          <div className="mb-4">
            <Controller
              control={control}
              name="phoneNumber"
              render={({ field: { onChange, ref, value }, fieldState: { error } }) => (
                <TextInput
                  label="How long have you been building?"
                  value={value || ''}
                  onChange={(v) => onChange(v || null)}
                  errorMessage={error?.message}
                  ref={ref}
                  Icon={Profile}
                />
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              &quot;6 months&quot;, &quot;20 years&quot;, &quot;just started&quot; — all good answers.
            </p>
          </div>

          {/* 4. What do you know? (Skills) */}
          <div className="mb-4">
            <p className="mb-1 text-sm font-medium text-foreground">What do you know?</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Type a skill and hit Enter — anything counts. Welding, systems thinking, law, gardening, pattern recognition, business strategy, cooking, whatever you bring to the table.
            </p>
            {selectedSkills.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className="rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-xs font-medium text-primary hover:bg-destructive/20 hover:border-destructive/40 hover:text-destructive-foreground transition-colors"
                    title="Click to remove"
                  >
                    {skill} ✕
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Type a skill and hit Enter..."
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); }}}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* 5. Link to what you're building */}
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">Link to what you&apos;re building</p>
            <p className="mb-2 text-xs text-muted-foreground">
              GitHub, website, store, portfolio, YouTube channel — add as many as you want. We&apos;ll help people find your work.
            </p>

            {/* Main website */}
            <Controller
              control={control}
              name="website"
              render={({ field: { onChange, ref, value }, fieldState: { error } }) => (
                <div className="mb-3">
                  <TextInput
                    label="Main website or link"
                    value={value || ''}
                    onChange={(v) => onChange(v || null)}
                    errorMessage={error?.message}
                    ref={ref}
                    Icon={WorldNet}
                  />
                </div>
              )}
            />

            {/* Additional portfolio links */}
            {portfolioLinks.map((link, i) => (
              <div key={i} className="mb-3 rounded-lg border border-border bg-background p-3">
                <div className="mb-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="What is this? (e.g. My YouTube, GitHub, Etsy store)"
                    value={link.title}
                    onChange={(e) => updatePortfolioLink(i, 'title', e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removePortfolioLink(i)}
                    className="rounded-lg px-2 text-destructive-foreground hover:bg-destructive/20"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="URL (https://...)"
                  value={link.url}
                  onChange={(e) => updatePortfolioLink(i, 'url', e.target.value)}
                  className="mb-2 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Short description — help people understand what they'll find"
                  value={link.description}
                  onChange={(e) => updatePortfolioLink(i, 'description', e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addPortfolioLink}
              className="w-full rounded-lg border border-dashed border-muted py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              + Add another link
            </button>
          </div>
        </div>

        {linksError && (
          <p className="text-right text-xs text-destructive-foreground">{linksError}</p>
        )}
        <div className="flex justify-end gap-4">
          <Button
            mode="secondary"
            type="button"
            loading={updateSessionUserDataMutation.isPending === true}
            onPress={resetForm}>
            Reset
          </Button>
          <Button type="submit" loading={updateSessionUserDataMutation.isPending === true || savingLinks}>
            {portfolioLinks.length > 0 ? 'Save & Join Network' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
