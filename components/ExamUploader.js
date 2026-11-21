// components/ExamUploader.js

"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ExamUploader({ onGenerated }) {
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState('Calculus');
  useEffect(() => {
    const course = new URLSearchParams(window.location.search).get('course');
    if (['Calculus I', 'Calculus II', 'Calculus III'].includes(course)) setTopic(course);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files ? e.target.files[0] : null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Please choose a PDF, JPG, or PNG under 20 MiB.");
      return;
    }
    setLoading(true);
    setError(null);


    const formData = new FormData();
    formData.append("exam_file", file);
    formData.append("topic", topic);
    formData.append("authorized", "true");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate questions. Check server logs.");
      }

      if (typeof data.session_id === "string") onGenerated(data.session_id);
      else setError("The session could not be saved. Please try again.");
    } catch (err) {
      setError(`Upload failed: ${err.message}`);

    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-10 text-xl font-semibold text-purple-600">
        Analyzing Exam & Generating 12 Questions...
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mt-4"></div>
      </div>
    );
  }

  return (
    <div className="upload-card">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">A fresh page to begin</h2>
      <p className="mb-5 text-sm text-gray-600">
        Enter answers with fractions, roots and symbols.{' '}
        <Link href="/math-editor" className="text-purple-700 underline">Try the math editor</Link>
      </p>

      {error && (
        <p role="alert" className="text-red-600 border border-red-300 bg-red-50 p-3 rounded-lg mb-4">{error}</p>
      )}

      <form onSubmit={handleUpload} className="space-y-4">

        <label htmlFor="practice-subject" className="block text-left text-sm font-medium text-gray-700">What are you studying?</label>
        <input
          id="practice-subject"
          type="text"
          placeholder="e.g. Calculus II"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        />

        <div className="upload-dropzone">
          <label htmlFor="exam-file" className="block text-gray-600 cursor-pointer">
            <span className="font-semibold block mb-1">{file ? file.name : "Choose your worksheet or practice exam"}</span>
            <span className="text-sm text-gray-500">Supported: JPG, PNG, PDF</span>
          </label>
          <input
            type="file"
            id="exam-file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleFileChange}
            className="sr-only"
            required
          />
        </div>

        <label className="upload-consent"><input type="checkbox" required /> <span>I’m authorized to upload this material and send it to the AI provider for practice generation. Maximum file size: 20 MiB.</span></label>
        <button
          type="submit"
          className="button upload-submit"
        >
          Create my practice session ↗
        </button>
      </form>
    </div>
  );
}
