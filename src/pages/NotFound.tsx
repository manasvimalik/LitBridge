import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="indic text-5xl text-maroon-600 dark:text-gold-300">?</p>
      <h1 className="mt-4 text-3xl font-bold">This page has wandered off</h1>
      <p className="muted mt-2">Like a folk tale, it may turn up somewhere else in a different form.</p>
      <Link to="/library" className="btn-primary mt-6">Back to the library</Link>
    </div>
  );
}
