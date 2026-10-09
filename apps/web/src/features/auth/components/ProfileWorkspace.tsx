"use client";
import { LocalizedValue } from "../../../i18n/LocalizedValue";
import { getFormattingLocale } from "../../../i18n/format-client";
import { Translate } from "../../../i18n/Translate";
import { useTranslations } from "../../../i18n/LocaleProvider";

import "../../../styles/profile.css";

import { useEffect, useState, type FormEvent } from "react";
import { Building2, Check, CircleUserRound, LockKeyhole, Mail, Save, ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { getProfile, requestEmailChange, saveProfile, type ProfileDetails } from "../services/api-client";
import { PageHeader } from "../../../ui/PageHeader";
import { Button } from "../../../ui/Button";

type Notice = { section: string; error: boolean; text: string } | null;
const empty = { firstName: "", lastName: "", phone: "", agencyName: "", agencyEmail: "", agencyPhone: "", address: "", city: "", state: "", country: "" };
type Values = typeof empty;
function fields(profile: ProfileDetails): Values {
  return { firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone ?? "",
    agencyName: profile.agency?.name ?? "", agencyEmail: profile.agency?.email ?? "", agencyPhone: profile.agency?.phone ?? "",
    address: profile.agency?.address ?? "", city: profile.agency?.city ?? "", state: profile.agency?.state ?? "", country: profile.agency?.country ?? "" };
}
function Field({ label, value, onChange, type = "text", placeholder, disabled = false }: {
  label: string; value: string; onChange?: (value: string) => void; type?: string; placeholder?: string; disabled?: boolean;
}) {
  const t = useTranslations();
  return <label className="profile-field"><span>{t(label)}</span><input type={type} value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder ? t(placeholder) : undefined} disabled={disabled} maxLength={160} /></label>;
}

export function ProfileWorkspace({ section }: { section?: "profile" | "security" | "agency" }) {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [values, setValues] = useState<Values>(empty);
  const [nextEmail, setNextEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const canEditAgency = user?.roleScope === "AGENCY" && Boolean(user.permissions.includes("agency:update"));

  useEffect(() => {
    let active = true;
    getProfile().then((result) => { if (active) { setProfile(result); setValues(fields(result)); setNextEmail(result.email); } })
      .catch((error) => { if (active) setNotice({ section: "page", error: true, text: error instanceof Error ? error.message : "Unable to load profile" }); });
    return () => { active = false; };
  }, []);
  const change = (key: keyof Values) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  const feedback = (section: string) => notice?.section === section
    ? <p role={notice.error ? "alert" : "status"} className={`profile-notice ${notice.error ? "error" : "success"}`}><LocalizedValue value={notice.text} /></p> : null;
  async function run(section: string, action: () => Promise<void>) {
    setBusy(section); setNotice(null);
    try { await action(); setNotice({ section, error: false, text: section === "personal" ? "Personal details saved." : section === "agency" ? "Agency details saved." : "Check your new email for a confirmation link. Your current address stays active until you confirm." }); }
    catch (error) { setNotice({ section, error: true, text: error instanceof Error ? error.message : "Unable to save changes" }); }
    finally { setBusy(null); }
  }
  function submitPersonal(event: FormEvent) {
    event.preventDefault(); void run("personal", async () => {
      const result = await saveProfile({ firstName: values.firstName, lastName: values.lastName, phone: values.phone.trim() || null });
      setProfile(result); setValues(fields(result)); await refreshUser();
    });
  }
  function submitAgency(event: FormEvent) {
    event.preventDefault(); if (!canEditAgency) return;
    void run("agency", async () => {
      const result = await saveProfile({ agency: { name: values.agencyName, email: values.agencyEmail.trim() || null,
        phone: values.agencyPhone.trim() || null, address: values.address.trim() || null,
        city: values.city.trim() || null, state: values.state.trim() || null, country: values.country.trim() || null } });
      setProfile(result); setValues(fields(result)); await refreshUser();
    });
  }
  function submitEmail(event: FormEvent) {
    event.preventDefault(); void run("email", async () => {
      const result = await requestEmailChange(nextEmail, password);
      setProfile((current) => current ? { ...current, pendingEmail: result.pendingEmail } : current);
      setPassword("");
    });
  }
  const initials = profile ? `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase() : "";
  return <>
    {!section && <PageHeader title="Profile & settings" description="Manage your personal account, agency details, and sign-in security." />}
    <div className="profile-workspace">
      {feedback("page")}
      <section className="profile-hero">
        <div className="profile-hero-main"><span className="profile-avatar-large">{initials || <CircleUserRound size={34} />}</span><div><span className="profile-kicker"><Translate text={"YOUR ACCOUNT"} /></span><h1><LocalizedValue value={profile ? `${profile.firstName} ${profile.lastName}` : "Loading profile…"} /></h1><p>{profile?.email ?? "Your platform account"}</p></div>{profile?.emailVerifiedAt && <span className="profile-verified"><ShieldCheck size={16} /> <Translate text={"Verified account"} /></span>}</div>
        <div className="profile-hero-foot"><span><Building2 size={15} /> {profile?.agency?.name ?? "Digol TravelOS"}</span><span><LockKeyhole size={15} /> {profile?.role.name ?? user?.roleName ?? "Member"}</span></div>
      </section>
      <div className={`profile-layout ${section ? "profile-tab-layout" : ""}`}>
        {!section && <nav className="profile-nav" aria-label="Profile sections"><span><Translate text={"SETTINGS"} /></span><a href="#personal-settings"><CircleUserRound size={17} /> <Translate text={"Personal details"} /></a>{profile?.agency && <a href="#agency-settings"><Building2 size={17} /> <Translate text={"Agency details"} /></a>}<a href="#security-settings"><ShieldCheck size={17} /> <Translate text={"Sign-in & security"} /></a></nav>}
        <div className="profile-sections">
          {(!section || section === "profile") && <section id="personal-settings" className="profile-panel"><header><span className="profile-icon"><CircleUserRound size={21} /></span><div><small><Translate text={"USER SETTINGS"} /></small><h2><Translate text={"Personal details"} /></h2><p><Translate text={"How your name and contact information appear in the platform."} /></p></div></header>
            <form onSubmit={submitPersonal}><div className="profile-grid two"><Field label="First name" value={values.firstName} onChange={change("firstName")} /><Field label="Last name" value={values.lastName} onChange={change("lastName")} /><Field label="Mobile number" type="tel" value={values.phone} onChange={change("phone")} placeholder="Add a mobile number" /><Field label="Role · managed by administrator" value={profile?.role.name ?? user?.roleName ?? ""} disabled /></div><footer>{feedback("personal")}<Button type="submit" disabled={!profile || busy !== null}><Save size={16} /> <LocalizedValue value={busy === "personal" ? "Saving…" : "Save personal details"} /></Button></footer></form>
          </section>}
          {profile?.agency && (!section || section === "agency") && <section id="agency-settings" className="profile-panel"><header><span className="profile-icon warm"><Building2 size={21} /></span><div><small><Translate text={"AGENCY SETTINGS"} /></small><h2><Translate text={"Agency details"} /></h2><p><Translate text={"Your agency identity and business contact details."} /></p></div></header>
            <form onSubmit={submitAgency}><div className="profile-grid two"><Field label="Agency name" value={values.agencyName} onChange={change("agencyName")} disabled={!canEditAgency} /><Field label="Branch · managed in platform settings" value={profile.branch?.name ?? "—"} disabled /><Field label="Contact email" type="email" value={values.agencyEmail} onChange={change("agencyEmail")} placeholder="agency@example.com" disabled={!canEditAgency} /><Field label="Contact phone" type="tel" value={values.agencyPhone} onChange={change("agencyPhone")} disabled={!canEditAgency} /></div><div className="profile-grid"><Field label="Business address" value={values.address} onChange={change("address")} disabled={!canEditAgency} /></div><div className="profile-grid three"><Field label="City" value={values.city} onChange={change("city")} disabled={!canEditAgency} /><Field label="State" value={values.state} onChange={change("state")} disabled={!canEditAgency} /><Field label="Country" value={values.country} onChange={change("country")} disabled={!canEditAgency} /></div><footer>{feedback("agency")}{canEditAgency ? <Button type="submit" disabled={busy !== null}><Save size={16} /> <LocalizedValue value={busy === "agency" ? "Saving…" : "Save agency details"} /></Button> : <span className="profile-help"><Translate text={"Only an agency administrator can edit these details."} /></span>}</footer></form>
          </section>}
          {(!section || section === "security") && <section id="security-settings" className="profile-panel"><header><span className="profile-icon green"><ShieldCheck size={21} /></span><div><small><Translate text={"ACCOUNT SECURITY"} /></small><h2><Translate text={"Sign-in & security"} /></h2><p><Translate text={"Change your sign-in email with confirmation at the new address."} /></p></div></header>
            <div className="profile-email-current"><Mail size={18} /><span><strong><Translate text={"Current sign-in email"} /></strong><small>{profile?.email ?? "—"}</small></span><b><LocalizedValue value={profile?.emailVerifiedAt ? <><Check size={14} /> <Translate text={"Verified"} /></> : "Unverified"} /></b></div>
            {profile?.pendingEmail && <p className="profile-pending"><Translate text={"Confirmation pending for"} />{" "}<strong>{profile.pendingEmail}</strong></p>}
            <form onSubmit={submitEmail}><div className="profile-grid two"><Field label="New email address" type="email" value={nextEmail} onChange={setNextEmail} placeholder="new@example.com" /><Field label="Current password" type="password" value={password} onChange={setPassword} placeholder="Confirm your password" /></div><p className="profile-help"><LockKeyhole size={15} /> <Translate text={"After you confirm the new address, all sessions end and you’ll need to sign in again."} /></p><footer>{feedback("email")}<Button type="submit" disabled={!profile || busy !== null || !password || nextEmail.trim().toLowerCase() === profile.email.toLowerCase()}><Mail size={16} /> <LocalizedValue value={busy === "email" ? "Sending…" : "Send confirmation link"} /></Button></footer></form>
          </section>}
          <p className="profile-member-since"><Translate text={"Member since"} />{" "}{profile ? new Date(profile.createdAt).toLocaleDateString(getFormattingLocale(), { month: "long", year: "numeric" }) : "—"}</p>
        </div>
      </div>
    </div>
  </>;
}
