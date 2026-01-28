'use client'
import React from 'react'
import { Upload, FileText, Sparkles } from 'lucide-react'

interface WelcomeHeroProps {
  onUploadResume?: () => void
  onCreateResume?: () => void
}

export default function WelcomeHero({ onUploadResume, onCreateResume }: WelcomeHeroProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16">
      <div className="text-center max-w-2xl">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-20 animate-pulse" />
            <div className="relative w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
              <FileText className="w-16 h-16 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 mb-4">
          Welcome to EditResume
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Create your professional resume in minutes. Upload an existing resume or start from scratch.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {onUploadResume && (
            <button
              onClick={onUploadResume}
              className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Your First Resume</span>
            </button>
          )}
          {onCreateResume && (
            <button
              onClick={onCreateResume}
              className="inline-flex items-center gap-3 px-8 py-4 border-2 border-indigo-600 text-indigo-600 bg-transparent rounded-xl font-semibold text-lg hover:bg-indigo-50 transition-all duration-200"
            >
              <Sparkles className="w-5 h-5" />
              <span>Create from Scratch</span>
            </button>
          )}
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-white rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Upload & Edit</h3>
            <p className="text-sm text-gray-600">Upload your existing resume in PDF or DOCX format</p>
          </div>
          <div className="p-6 bg-white rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI-Powered</h3>
            <p className="text-sm text-gray-600">Get AI suggestions to improve your resume content</p>
          </div>
          <div className="p-6 bg-white rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Export Anywhere</h3>
            <p className="text-sm text-gray-600">Download as PDF or DOCX for your applications</p>
          </div>
        </div>
      </div>
    </div>
  )
}
