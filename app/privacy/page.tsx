export const metadata = { title: "Privacy and data · Clinician Research Exchange" };

export default function PrivacyPage() {
  return (
    <article className="panel stack" style={{ maxWidth: "72ch" }}>
      <h2>Privacy and data</h2>
      <p>
        The exchange collects <b>aggregated patterns and questions about groups of patients</b>, never individual cases. Please do not
        enter anything that could identify a patient: names, dates of birth or visits, phone numbers, email addresses, record or ID
        numbers, or combinations such as an exact age with an occupation and a ward.
      </p>
      <h3 className="sec">How we check</h3>
      <p>
        Every free-text field is checked when you submit. Obvious identifiers block the post and we tell you what was found. Softer
        combinations, such as a ward or bed number, are saved but held back until a moderator has reviewed them. These checks look for
        patterns only, so they cannot catch everything. Please re-read before posting.
      </p>
      <h3 className="sec">What is shown</h3>
      <ul>
        <li>Questions and papers show the name you enter, your specialty and city.</li>
        <li>Patient nominations are anonymous. Only the reasons, how long you have seen the doctor and the broad area of care are shown. Notes are visible to the exchange team only.</li>
        <li>Doctor profiles are compiled by the exchange team from public information. Doctors added by patients are marked &quot;not verified&quot;.</li>
      </ul>
      <h3 className="sec">What we store about you</h3>
      <ul>
        <li>A random browser id in a cookie, so the same browser cannot vote or nominate the same doctor twice.</li>
        <li>A salted hash of your connection&apos;s IP address, kept for one day, to limit how many changes one connection can make.</li>
      </ul>
      <p className="meta">
        The data-protection policy that applies is being confirmed with participating clinicians before real data is collected.
      </p>
    </article>
  );
}
