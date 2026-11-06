'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowLeft, Key, CheckCircle, AlertCircle, School } from 'lucide-react';
import Navbar from '@/components/Navbar';
import EmptyState from '@/components/EmptyState';
import { ClassItem, User } from '@/lib/types';
import { sounds } from '@/components/sound-effects';
import { fireConfetti } from '@/components/ConfettiCelebration';

export default function StudentLoginPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch('/api/classes');
        const data = await res.json();
        setClasses(data.classes || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
  }, []);

  // When class is selected, load students
  const handleSelectClass = async (cls: ClassItem) => {
    sounds.pop();
    setSelectedClass(cls);
    setSelectedStudent(null);
    setPin('');
    setError('');

    try {
      const res = await fetch(`/api/students?class_id=${cls.id}`);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectStudent = (stu: User) => {
    sounds.pop();
    setSelectedStudent(stu);
    setPin('');
    setError('');
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudent || !selectedClass) return;

    setError('');
    setLoggingIn(true);

    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          classId: selectedClass.id,
          pin: pin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      sounds.fanfare();
      fireConfetti();
      router.push('/student/portal');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Incorrect PIN. Try again!');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    sounds.pop();
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        // Auto-submit on 4th digit!
        setTimeout(() => {
          handleDirectSubmit(newPin);
        }, 100);
      }
    }
  };

  const handleKeypadBackspace = () => {
    sounds.pop();
    setPin((prev) => prev.slice(0, -1));
  };

  const handleDirectSubmit = async (pinValue: string) => {
    if (!selectedStudent || !selectedClass) return;
    setError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          classId: selectedClass.id,
          pin: pinValue.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect PIN');
      sounds.fanfare();
      fireConfetti();
      router.push('/student/portal');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 via-sky-50 to-pink-50 bg-polka">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        {/* Banner Pill */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-amber-400 text-white flex items-center justify-center text-4xl mx-auto shadow-pop-yellow mb-4 animate-float">
            🎒
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-display text-slate-800">
            Student Classroom Check-In
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Pick your class, find your animal avatar, and jump into your learning library!
          </p>
        </div>

        {/* Step 1: Select Class */}
        {!selectedClass && (
          <div className="w-full bg-white rounded-4xl p-6 sm:p-8 border-4 border-amber-300 shadow-bouncy space-y-6">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-amber-950 text-xs font-black px-2.5 py-1 rounded-full">
                Step 1
              </span>
              <h2 className="text-xl font-bold font-display text-slate-800">
                Choose Your Classroom:
              </h2>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 font-bold">
                Looking for classes...
              </div>
            ) : classes.length === 0 ? (
              <EmptyState
                title="No classrooms yet!"
                message="Your teacher hasn't created a classroom yet. Ask your teacher to set up your class in the Teacher Portal!"
                icon="backpack"
                actionLabel="Switch to Teacher Login"
                onAction={() => router.push('/teacher/login')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => handleSelectClass(cls)}
                    className="p-5 rounded-3xl text-left border-3 border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/50 shadow-sm hover:shadow-pop-yellow transition-all transform hover:-translate-y-1 group flex flex-col justify-between"
                  >
                    <div>
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-inner"
                        style={{ backgroundColor: `${cls.color}30` }}
                      >
                        {cls.icon || '🎒'}
                      </div>
                      <h3 className="text-lg font-black font-display text-slate-800 group-hover:text-amber-800 transition-colors">
                        {cls.name}
                      </h3>
                      <div className="text-xs text-slate-500 font-bold mt-0.5">
                        {cls.grade_level || 'Grade 1'}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>{cls.student_count || 0} Learners</span>
                      <span className="text-amber-600 font-black">Enter &rarr;</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 & 3: Select Student & Enter PIN */}
        {selectedClass && (
          <div className="w-full bg-white rounded-4xl p-6 sm:p-8 border-4 border-sky-300 shadow-bouncy space-y-6 animate-pop">
            {/* Top Class Switcher Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedClass.icon || '🎒'}</span>
                <div>
                  <div className="text-xs font-black uppercase text-sky-600 tracking-wider">
                    Current Classroom
                  </div>
                  <h3 className="text-xl font-black font-display text-slate-800">
                    {selectedClass.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => {
                  sounds.pop();
                  setSelectedClass(null);
                  setSelectedStudent(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-extrabold flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Class</span>
              </button>
            </div>

            {/* Student Picker */}
            {!selectedStudent ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-sky-500 text-white text-xs font-black px-2.5 py-1 rounded-full">
                    Step 2
                  </span>
                  <h3 className="text-lg font-bold font-display text-slate-800">
                    Which learner are you? Tap your name:
                  </h3>
                </div>

                {students.length === 0 ? (
                  <EmptyState
                    title="No students enrolled yet!"
                    message="Your teacher hasn't enrolled any students into this classroom yet. Please ask your teacher to add you!"
                    icon="robot"
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {students.map((stu) => (
                      <button
                        key={stu.id}
                        onClick={() => handleSelectStudent(stu)}
                        className="p-4 rounded-3xl bg-slate-50 hover:bg-sky-50 border-3 border-slate-200 hover:border-sky-400 text-center transition-all transform hover:scale-105 shadow-sm hover:shadow-pop-blue flex flex-col items-center"
                      >
                        <span className="text-4xl mb-2">{stu.avatar || '🦊'}</span>
                        <div className="font-extrabold text-sm text-slate-800 truncate max-w-[120px]">
                          {stu.name}
                        </div>
                        <div className="text-[11px] text-amber-600 font-bold mt-0.5">
                          ⭐ {stu.stars || 0} stars
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Step 3: Kid PIN Keypad */
              <div className="max-w-sm mx-auto text-center space-y-5 animate-pop">
                <div className="flex flex-col items-center">
                  <span className="text-6xl mb-2 animate-bounce">{selectedStudent.avatar || '🦊'}</span>
                  <h3 className="text-2xl font-black font-display text-slate-800">
                    Hello, {selectedStudent.name}!
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Enter your 4-digit PIN to open your library
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 4-Dot PIN Indicator */}
                <div className="flex justify-center gap-3 my-4">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        pin.length > idx
                          ? 'bg-sky-500 border-sky-600 scale-125'
                          : 'bg-slate-100 border-slate-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Kid-Friendly Number Keypad */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      className="btn-bouncy h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-sky-100 text-xl font-black text-slate-800 flex items-center justify-center shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      sounds.pop();
                      setSelectedStudent(null);
                    }}
                    className="h-14 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="btn-bouncy h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xl font-black text-slate-800 flex items-center justify-center shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="h-14 rounded-2xl text-xs font-bold text-slate-400 hover:text-rose-500 flex items-center justify-center"
                  >
                    ⌫
                  </button>
                </div>

                {/* Or 1-Click Easy Sign In for young kids without PIN */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleLogin()}
                    disabled={loggingIn}
                    className="btn-bouncy w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-black text-sm shadow-pop-blue flex items-center justify-center gap-2"
                  >
                    {loggingIn ? (
                      <span>Opening Classroom...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Open My Classroom Library</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
