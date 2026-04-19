import { useState, useEffect, FormEvent } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, onSnapshot, setDoc, query, collection, where, getDocs, getDoc } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, LogIn, LayoutDashboard, Send, Clock, AlertCircle, ExternalLink, Users, CheckCircle, Trash2, Plus, Check, ChevronLeft, ChevronRight, X, Award, History, TrendingUp, Medal, Star } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "./lib/utils";

const LOGO_URL = "https://upload.wikimedia.org/wikipedia/ar/1/17/Saudi_Ministry_of_Education_Logo_2025.png";

// --- Types ---
type QuestionType = "text" | "image" | "mcq" | "multi";

interface CompetitionData {
  id: string;
  title: string;
  question: string;
  questionType: QuestionType;
  questionImageUrl?: string;
  options?: string[]; // For MCQ/Multi
  prizeImageUrl?: string;
  adImageUrl?: string;
  adLink?: string;
  status: "idle" | "active" | "drawing" | "finished";
  endTime?: string;
  winnerId?: string;
  winnerName?: string;
  winnerGrade?: string;
  winnerSection?: string;
  note?: string;
}

interface StudentProfile {
  nationalId: string;
  name: string;
  uid: string;
  grade?: string;
  section?: string;
}

interface PastWinner {
  id: string;
  compTitle: string;
  winnerName: string;
  winnerGrade: string;
  winnerSection: string;
  prizeImageUrl?: string;
  date: string;
}

// --- Components ---

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-dark-bg flex items-center justify-center z-50">
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="flex flex-col items-center"
      >
        <Trophy className="w-16 h-16 text-neon-cyan mb-4" />
        <h2 className="text-2xl font-bold neon-glow-cyan">جاري التحميل...</h2>
      </motion.div>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (p: StudentProfile) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [nationalId, setNationalId] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("الأول متوسط");
  const [section, setSection] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nationalId || (mode === "register" && !name)) {
      setError("يرجى إكمال الحقول المطلوبة");
      return;
    }
    setLoading(true);
    setError("");
    
    try {
      if (mode === "register") {
        // التحقق من تكرار التسجيل بنفس رقم الهوية
        const q = query(collection(db, "students"), where("nationalId", "==", nationalId));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setError("هذا الرقم مسجل مسبقاً، يرجى تسجيل الدخول بدلاً من التسجيل");
          setLoading(false);
          return;
        }

        let uid;
        try {
          const userCred = await signInAnonymously(auth);
          uid = userCred.user.uid;
        } catch (authErr: any) {
          console.warn("Firebase Auth blocked:", authErr.message);
          // Fallback to a deterministic ID if Anonymous Auth is disabled in console
          uid = "std_" + btoa(nationalId).replace(/=/g, "");
        }

        const studentData = { 
          nationalId, 
          name, 
          grade, 
          section, 
          createdAt: new Date().toISOString(), 
          uid 
        };
        await setDoc(doc(db, "students", uid), studentData);
        localStorage.setItem("eduwin_student", JSON.stringify(studentData));
        onLogin(studentData);
      } else {
        // تسجيل الدخول برقم الهوية
        const q = query(collection(db, "students"), where("nationalId", "==", nationalId));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setError("هذا الرقم غير مسجل، يرجى إنشاء حساب جديد أولاً");
          setLoading(false);
          return;
        }

        const studentData = snap.docs[0].data() as StudentProfile;
        
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn("Login Auth fallback used");
        }

        localStorage.setItem("eduwin_student", JSON.stringify(studentData));
        onLogin(studentData);
      }
    } catch (err: any) {
      console.error(err);
      setError("حدث خطأ أثناء العملية: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-dark-surface p-8 rounded-2xl border border-neon-purple/30 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-purple animate-pulse" />
        
        <div className="text-center mb-8">
          <img 
            src={LOGO_URL} 
            alt="Logo" 
            className="w-32 h-auto mx-auto mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" 
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-bold neon-glow-cyan mb-2 tracking-tight">مسابقة عماد الدين زنكي المتوسطة</h1>
          <p className="text-white/60">شارك في المسابقات الطلابية الكبرى</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/40 rounded-xl p-1 mb-8 gap-1">
          <button
            onClick={() => setMode("register")}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
              mode === "register" ? "bg-neon-purple text-white shadow-lg" : "text-white/40 hover:text-white/70"
            )}
          >
            تسجيل جديد
          </button>
          <button
            onClick={() => setMode("login")}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
              mode === "login" ? "bg-neon-purple text-white shadow-lg" : "text-white/40 hover:text-white/70"
            )}
          >
            دخول (بالهوية)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-neon-cyan/80 text-right uppercase tracking-wider">رقم الهوية</label>
            <input
              type="text"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              className="w-full bg-black/30 border-2 border-white/10 rounded-xl px-4 py-3 focus:border-neon-purple outline-none transition-all text-right"
              placeholder="أدخل رقم الهوية هنا"
            />
          </div>
          
          {mode === "register" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-bold mb-2 text-neon-cyan/80 text-right uppercase tracking-wider">الاسم الثلاثي</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/30 border-2 border-white/10 rounded-xl px-4 py-3 focus:border-neon-purple outline-none transition-all text-right"
                  placeholder="أدخل اسمك الكامل"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-neon-cyan/80 text-right uppercase tracking-wider">الفصل</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full bg-black/30 border-2 border-white/10 rounded-xl px-4 py-3 focus:border-neon-purple outline-none transition-all text-right text-white"
                  >
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                      <option key={n} value={n.toString()}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-neon-cyan/80 text-right uppercase tracking-wider">الصف</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full bg-black/30 border-2 border-white/10 rounded-xl px-4 py-3 focus:border-neon-purple outline-none transition-all text-right text-white"
                  >
                    <option value="الأول متوسط">الأول متوسط</option>
                    <option value="الثاني متوسط">الثاني متوسط</option>
                    <option value="الثالث متوسط">الثالث متوسط</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg justify-end border border-red-400/20 text-right">
              <span>{error}</span>
              <AlertCircle className="w-4 h-4" />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neon-purple text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(188,19,254,0.3)]"
          >
            {loading ? "جاري المعالجة..." : (
              <>
                <LogIn className="w-5 h-5" />
                <span>{mode === "register" ? "إكمال التسجيل" : "دخول المسابقة"}</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function StudentInterface({ student }: { student: StudentProfile }) {
  const [activeTab, setActiveTab] = useState<"live" | "honor" | "hall">("live");
  const [competition, setCompetition] = useState<CompetitionData | null>(null);
  const [answer, setAnswer] = useState("");
  const [multiAnswers, setMultiAnswers] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("00:00");
  const [qualifiedStudents, setQualifiedStudents] = useState<{ id: string, name: string }[]>([]);
  const [pastWinners, setPastWinners] = useState<PastWinner[]>([]);
  const [topStudents, setTopStudents] = useState<any[]>([]);

  // منع النسخ وتصوير الشاشة المتكرر (مستوى الـ DOM)
  useEffect(() => {
    const preventActions = (e: any) => {
      if (e.type === 'contextmenu' || e.type === 'copy' || e.type === 'selectstart') {
        e.preventDefault();
      }
    };
    
    // محاكاة حماية ضد لقطات الشاشة (فقط تنبيه أو تعتيم)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // يمكن إضافة تعتيم هنا إذا لزم الأمر
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // منع PrintScreen, Ctrl+C, Ctrl+V, F12
      if (
        e.key === 'PrintScreen' || 
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 's')) || 
        e.key === 'F12'
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', preventActions);
    window.addEventListener('copy', preventActions);
    window.addEventListener('selectstart', preventActions);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('contextmenu', preventActions);
      window.removeEventListener('copy', preventActions);
      window.removeEventListener('selectstart', preventActions);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, "competitions"), where("status", "!=", "idle"));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setCompetition({ id: docData.id, ...docData.data() } as CompetitionData);
      } else {
        setCompetition(null);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "competitions"), where("status", "==", "finished")), (snapshot) => {
      const winners = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          compTitle: data.title,
          winnerName: data.winnerName,
          winnerGrade: data.winnerGrade,
          winnerSection: data.winnerSection,
          prizeImageUrl: data.prizeImageUrl,
          date: data.endTime || data.createdAt
        } as PastWinner;
      });
      setPastWinners(winners.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Generate some mock top students for "Honor Roll"
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const studs = snapshot.docs.map(d => d.data());
      setTopStudents(studs.slice(0, 10)); // Take first 10 for display
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (competition && student) {
      const checkStatus = async () => {
        const answerDoc = await getDoc(doc(db, `competitions/${competition.id}/answers`, student.uid));
        if (answerDoc.exists()) {
          setSubmitted(true);
          setAnswer(answerDoc.data().answerText);
        } else {
          setSubmitted(false);
          setAnswer("");
        }
      };
      checkStatus();
    }
  }, [competition?.id, student?.uid]);

  useEffect(() => {
    if (!competition || competition.status !== "active" || !competition.endTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(competition.endTime!).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(timer);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [competition]);

  useEffect(() => {
    if (competition?.status === "drawing") {
      const loadQualified = async () => {
         const q = query(collection(db, `competitions/${competition.id}/answers`), where("isCorrect", "==", true));
         const snap = await getDocs(q);
         const students = snap.docs.map(d => ({ id: d.id, name: d.data().studentName }));
         setQualifiedStudents(students);
      };
      loadQualified();
    }
  }, [competition?.status, competition?.id]);

  const handleSendAnswer = async () => {
    const finalAnswer = competition?.questionType === "multi" ? multiAnswers.join(", ") : answer;
    if (!finalAnswer || !competition || submitted) return;
    try {
      await setDoc(doc(db, `competitions/${competition.id}/answers`, student.uid), {
        studentId: student.uid,
        studentName: student.name,
        grade: student.grade || "غير محدد",
        section: student.section || "غير محدد",
        answerText: finalAnswer,
        timestamp: new Date().toISOString(),
        isCorrect: false,
        reviewed: false
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMultiOption = (opt: string) => {
    setMultiAnswers(prev => 
      prev.includes(opt) ? prev.filter(a => a !== opt) : [...prev, opt]
    );
  };

  if (!competition) {
    return (
      <div className="min-h-screen flex flex-col p-5 gap-4">
        <header className="h-20 flex flex-row-reverse justify-between items-center bg-[rgba(20,20,35,0.8)] border border-neon-cyan/20 rounded-xl px-8 shadow-2xl">
          <div className="flex flex-row-reverse items-center gap-4">
            <img 
              src={LOGO_URL} 
              alt="Logo" 
              className="w-10 h-auto drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]" 
              referrerPolicy="no-referrer"
            />
            <div className="text-right">
              <div className="font-bold text-base">{student.name}</div>
              <div className="text-[12px] opacity-60">
                {student.grade} - فصل: {student.section} | الهوية: {student.nationalId}
              </div>
            </div>
          </div>
          <div className="flex flex-row-reverse items-center gap-5">
            <span className="text-sm opacity-80">الحالة: متصل</span>
            <span className="bg-green-500/20 text-green-500 text-[11px] font-bold px-3 py-1 rounded">بث مباشر</span>
          </div>
        </header>

        <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-dark-surface/30 rounded-3xl border border-white/5">
          <Clock className="w-20 h-20 text-white/20 mb-6" />
          <h2 className="text-3xl font-bold text-white/40">لا توجد مسابقات جارية حالياً</h2>
          <p className="text-white/30 mt-2">يرجى الانتظار حتى تبدأ الإدارة المسابقة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-5 gap-4">
      {/* Header / Top Nav */}
      <header className="h-20 flex flex-row-reverse justify-between items-center bg-[rgba(20,20,35,0.8)] border border-neon-cyan/20 rounded-xl px-8 shadow-2xl">
        <div className="flex flex-row-reverse items-center gap-4">
          <img 
            src={LOGO_URL} 
            alt="Logo" 
            className="w-10 h-auto drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]" 
            referrerPolicy="no-referrer"
          />
          <div className="text-right">
            <div className="font-bold text-base">{student.name}</div>
            <div className="text-[12px] opacity-60">
              {student.grade} - فصل: {student.section} | الهوية: {student.nationalId}
            </div>
          </div>
        </div>

        {(competition.prizeImageUrl || competition.title) && (
          <div className="hidden md:flex flex-row-reverse items-center gap-4 bg-accent-gold/10 px-5 py-2 rounded-[50px] border border-accent-gold max-w-[40%]">
            <Trophy className="w-6 h-6 text-accent-gold flex-shrink-0" />
            <div className="flex flex-row-reverse items-center gap-2 overflow-hidden">
              {competition.prizeImageUrl && (
                <img 
                  src={competition.prizeImageUrl} 
                  alt="Prize" 
                  className="w-8 h-8 rounded-full object-cover border border-accent-gold/50"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="font-bold text-accent-gold truncate text-sm">الجائزة: {competition.title}</span>
            </div>
          </div>
        )}

        <div className="flex flex-row-reverse items-center gap-5">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">الحالة</span>
            <span className="text-green-500 text-xs font-bold flex items-center gap-1 flex-row-reverse">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              متصل الآن
            </span>
          </div>
          
          <button 
            onClick={() => {
              auth.signOut();
              localStorage.removeItem("eduwin_student");
              window.location.reload();
            }}
            className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all border border-white/5"
            title="تسجيل الخروج"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex flex-row-reverse items-center justify-center gap-2 p-1 bg-dark-surface/50 backdrop-blur-md rounded-2xl border border-white/5 w-fit mx-auto">
        <button 
          onClick={() => setActiveTab("live")}
          className={cn(
            "flex flex-row-reverse items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all text-sm",
            activeTab === "live" ? "bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,243,255,0.3)]" : "text-white/40 hover:text-white/70"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          البث المباشر
        </button>
        <button 
          onClick={() => setActiveTab("honor")}
          className={cn(
            "flex flex-row-reverse items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all text-sm",
            activeTab === "honor" ? "bg-neon-purple text-white shadow-[0_0_15px_rgba(188,19,254,0.3)]" : "text-white/40 hover:text-white/70"
          )}
        >
          <Award className="w-4 h-4" />
          لوحة الشرف
        </button>
        <button 
          onClick={() => setActiveTab("hall")}
          className={cn(
            "flex flex-row-reverse items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all text-sm",
            activeTab === "hall" ? "bg-accent-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]" : "text-white/40 hover:text-white/70"
          )}
        >
          <Medal className="w-4 h-4" />
          أبطال المسابقات
        </button>
      </nav>

      {/* Live Winners Ticker */}
      <div className="bg-black/40 border-y border-white/5 overflow-hidden py-2">
        <motion.div 
          animate={{ x: [1000, -2000] }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          className="whitespace-nowrap flex gap-10"
        >
          {pastWinners.length > 0 ? pastWinners.map((w, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <Star className="w-4 h-4 text-accent-gold animate-spin-slow" />
              <span className="text-white/60">مبروك للبطل:</span>
              <span className="text-neon-cyan font-bold">{w.winnerName}</span>
              <span className="text-white/20">|</span>
              <span className="text-white/60">الفائز بمسابقة:</span>
              <span className="text-accent-gold font-bold">{w.compTitle}</span>
            </div>
          )) : (
            <div className="flex items-center gap-3 text-sm">
              <Star className="w-4 h-4 text-accent-gold" />
              <span className="text-white/40">مرحباً بكم في مسابقة عماد الدين زنكي المتوسطة.. بالتوفيق لجميع الأبطال!</span>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "live" && (
          <motion.div 
            key="live-tab"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-grow grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4"
          >
        {/* Sidebar */}
        <aside className="bg-dark-surface rounded-2xl border border-white/5 p-5 flex flex-col gap-5 order-2 lg:order-1">
          <div className="bg-black rounded-xl p-5 text-center border-2 border-neon-cyan shadow-[0_0_15px_rgba(0,243,255,0.3)]">
            <span className="text-[12px] uppercase text-neon-cyan tracking-[2px] mb-1 block">الوقت المتبقي</span>
            <div className="text-5xl font-bold digital-font text-neon-cyan neon-glow-cyan">{timeLeft}</div>
          </div>

          <div>
            <h3 className="text-[14px] text-neon-purple uppercase mb-4 tracking-[1px] font-bold text-right">إحصائيات المسابقة</h3>
            <ul className="space-y-3">
              <li className="flex flex-row-reverse justify-between py-3 border-b border-white/5 text-sm">
                <span>الطلاب المشاركين</span>
                <span className="text-neon-cyan font-bold">1,248</span>
              </li>
              <li className="flex flex-row-reverse justify-between py-3 border-b border-white/5 text-sm">
                <span>إجابات صحيحة</span>
                <span className="text-neon-cyan font-bold">452</span>
              </li>
            </ul>
          </div>

          <div className="mt-auto bg-white/5 p-4 rounded-xl text-xs leading-relaxed text-right border border-neon-purple/20">
            <strong className="text-neon-purple block mb-1">تنبيه الإدارة:</strong>
            سيتم تفعيل السحب الآلي فور انتهاء العداد. تأكد من صحة إجابتك قبل الإرسال.
          </div>
        </aside>

        {/* Main Stage */}
        <main className="flex flex-col gap-4 order-1 lg:order-2">
          <AnimatePresence mode="wait">
            {competition.status === "active" && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-grow flex flex-col bg-dark-surface/30 backdrop-blur-xl rounded-[40px] border border-white/5 p-10 shadow-2xl relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-[80px] -ml-32 -mb-32" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="inline-flex items-center gap-3 bg-neon-purple/10 text-neon-purple px-5 py-2 rounded-full text-xs font-black uppercase tracking-[3px] border border-neon-purple/20 mb-8">
                    <div className="w-2 h-2 rounded-full bg-neon-purple animate-pulse" />
                    المسابقة جارية الآن
                  </div>
                  
                  {competition.questionImageUrl && (
                    <motion.div 
                      layoutId="q-img"
                      className="relative mb-10 group"
                    >
                      <div className="absolute inset-0 bg-neon-cyan/20 blur-2xl opacity-0 group-hover:opacity-100 transition-all" />
                      <img 
                        src={competition.questionImageUrl} 
                        alt="Question" 
                        className="max-h-[350px] w-auto rounded-3xl border-4 border-white/5 shadow-2xl relative z-10 transform transition-transform group-hover:scale-[1.02]"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  )}

                  <h3 className="text-3xl md:text-4xl font-black leading-tight mb-12 max-w-[900px] text-center text-white selection:bg-neon-cyan selection:text-black">
                    {competition.question}
                  </h3>

                  {!submitted ? (
                    <div className="w-full max-w-[800px] flex flex-col gap-8">
                      {/* Interactive Answer Area */}
                      <div className="p-8 bg-black/40 rounded-[32px] border border-white/10 shadow-inner">
                        {competition.questionType === "text" && (
                          <div className="flex flex-col gap-4">
                            <label className="text-xs font-bold text-white/30 uppercase tracking-widest text-right">أدخل إجابتك بدقة</label>
                            <input
                              type="text"
                              value={answer}
                              onChange={(e) => setAnswer(e.target.value)}
                              placeholder="أجب هنا..."
                              className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-5 text-white text-xl outline-none focus:border-neon-purple transition-all text-right shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                            />
                          </div>
                        )}

                        {(competition.questionType === "mcq" || competition.questionType === "multi") && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {competition.options?.map((opt, i) => {
                              const isSelected = competition.questionType === "multi" ? multiAnswers.includes(opt) : answer === opt;
                              return (
                                <button
                                  key={i}
                                  onClick={() => competition.questionType === "multi" ? toggleMultiOption(opt) : setAnswer(opt)}
                                  className={cn(
                                    "p-5 rounded-2xl border-2 transition-all text-lg font-black text-right relative overflow-hidden group",
                                    isSelected 
                                      ? "border-neon-cyan bg-neon-cyan/20 text-white shadow-[0_0_20px_rgba(0,243,255,0.2)]" 
                                      : "border-white/5 bg-white/5 text-white/40 hover:bg-white/10 hover:border-white/20"
                                  )}
                                >
                                  {isSelected && (
                                    <motion.div 
                                      layoutId="check-bg"
                                      className="absolute left-0 top-0 bottom-0 w-1 bg-neon-cyan" 
                                    />
                                  )}
                                  <span className="relative z-10">{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        <button
                          onClick={() => setIsConfirming(true)}
                          disabled={competition.questionType === "multi" ? multiAnswers.length === 0 : !answer}
                          className="w-full md:w-auto bg-white text-black font-black py-5 px-16 rounded-2xl hover:bg-neon-purple hover:text-white transition-all transform hover:scale-[1.05] active:scale-[0.95] shadow-2xl disabled:opacity-30 disabled:grayscale text-xl uppercase tracking-widest"
                        >
                          تأكيد وإرسال المشاركة
                        </button>
                        <p className="text-[10px] text-white/20 uppercase tracking-[2px]">بمجرد الإرسال لن تتمكن من تعديل الإجابة</p>
                      </div>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-green-500/10 border-2 border-green-500/20 p-12 rounded-[40px] text-center max-w-[600px] relative overflow-hidden"
                    >
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
                      <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                      <h4 className="text-3xl font-black text-white mb-4">تم الإرسال بنجاح!</h4>
                      <p className="text-white/50 text-lg leading-relaxed">
                        شكراً لك يا بطل. إجابتك الآن في مرحلة التدقيق. <br/>اربط حزام الأمان، السحب سيبدأ قريباً!
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {competition.status === "drawing" && (
              <motion.div
                key="drawing"
                className="flex-grow flex flex-col items-center justify-center p-10 bg-dark-surface rounded-[40px] border border-neon-purple/20 shadow-2xl"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="w-24 h-24 border-4 border-neon-purple border-t-transparent rounded-full mb-8 shadow-[0_0_20px_rgba(188,19,254,0.3)]"
                />
                <h2 className="text-4xl font-bold neon-glow-purple mb-4">جاري تدوير القرص...</h2>
                <div className="w-full max-w-xl h-24 overflow-hidden relative bg-black/50 rounded-2xl border border-white/10 flex items-center">
                  <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-dark-surface via-transparent to-dark-surface" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-neon-cyan z-20 shadow-[0_0_20px_var(--neon-cyan)]" />
                  <motion.div
                    animate={{ x: [-2000, 0] }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="whitespace-nowrap flex gap-12 text-3xl font-bold opacity-30"
                  >
                    {Array(20).fill(0).map((_, i) => (
                      <span key={i} className="text-neon-cyan">؟ ؟ ؟ ؟</span>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {competition.status === "finished" && (
              <motion.div
                key="finished"
                className="flex-grow flex flex-col items-center justify-center space-y-8"
              >
                <div className="relative bg-dark-surface p-10 md:p-16 rounded-[50px] border-4 border-accent-gold text-center shadow-[0_0_50px_rgba(255,215,0,0.1)] w-full max-w-2xl">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#050508] p-4 rounded-full border-4 border-accent-gold">
                    <Trophy className="w-16 h-16 text-accent-gold neon-glow-purple" />
                  </div>
                  
                  <h1 className="text-xl text-accent-gold font-bold mb-6 mt-4 uppercase tracking-[2px]">الفائز بالمسابقة</h1>
                  
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-5xl md:text-7xl font-black neon-glow-cyan mb-8 uppercase break-words px-4"
                  >
                    {competition.winnerName}
                  </motion.div>

                  <div className="inline-flex flex-col items-center gap-4 bg-accent-gold/5 border border-accent-gold/20 p-6 rounded-3xl w-full">
                    <span className="text-white/40 text-sm uppercase tracking-wider">الجائزة المستلمة:</span>
                    <div className="flex flex-col items-center gap-3">
                      {competition.prizeImageUrl && (
                        <img 
                          src={competition.prizeImageUrl} 
                          alt="Prize" 
                          className="w-32 h-32 md:w-48 md:h-48 rounded-2xl object-cover border-2 border-accent-gold shadow-lg"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <h4 className="text-2xl font-bold text-accent-gold">{competition.title}</h4>
                    </div>
                  </div>

                  {competition.note && (
                    <div className="mt-8 p-4 bg-white/5 rounded-xl text-white/60 text-sm italic">
                      {competition.note}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => window.location.reload()}
                  className="px-10 py-4 border-2 border-neon-cyan text-neon-cyan font-bold rounded-full hover:bg-neon-cyan hover:text-dark-bg transition-all neon-border-cyan group"
                >
                  <span className="flex items-center gap-2">
                    الرجوع للرئيسية
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </motion.div>
    )}

        {activeTab === "honor" && (
          <motion.div
            key="honor-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow flex flex-col gap-6"
          >
            <div className="bg-dark-surface p-10 rounded-[40px] border border-neon-purple/20 text-center relative overflow-hidden backdrop-blur-xl">
               <div className="absolute top-0 right-0 w-96 h-96 bg-neon-purple/5 rounded-full blur-[100px] -mr-48 -mt-48" />
               <Award className="w-20 h-20 text-neon-purple mx-auto mb-6 drop-shadow-[0_0_15px_rgba(188,19,254,0.5)]" />
               <h2 className="text-5xl font-black text-white mb-2">لوحة الشرف</h2>
               <p className="text-white/40 text-lg uppercase tracking-widest">أكثر الطلاب تميزاً وتفاعلاً في المنصة</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
               {topStudents.map((s, idx) => (
                 <motion.div
                   key={idx}
                   whileHover={{ y: -10 }}
                   className="bg-dark-surface p-6 rounded-[32px] border border-white/5 flex flex-row-reverse items-center gap-6 group relative overflow-hidden"
                 >
                   <div className="absolute top-0 right-0 w-1 h-full bg-neon-purple opacity-0 group-hover:opacity-100 transition-all" />
                   <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl font-black text-neon-purple">
                     {idx + 1}
                   </div>
                   <div className="flex-grow text-right">
                     <h4 className="text-xl font-bold group-hover:text-neon-purple transition-colors">{s.name}</h4>
                     <p className="text-white/40 text-sm">{s.grade} - فصل: {s.section}</p>
                   </div>
                   {idx < 3 && <Trophy className={cn("w-6 h-6", idx === 0 ? "text-accent-gold" : idx === 1 ? "text-gray-400" : "text-amber-700")} />}
                 </motion.div>
               ))}
            </div>
          </motion.div>
        )}

        {activeTab === "hall" && (
          <motion.div
            key="hall-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow flex flex-col gap-6"
          >
            <div className="bg-dark-surface p-10 rounded-[40px] border border-accent-gold/20 text-center relative overflow-hidden backdrop-blur-xl">
               <div className="absolute top-0 right-0 w-96 h-96 bg-accent-gold/5 rounded-full blur-[100px] -mr-48 -mt-48" />
               <Medal className="w-20 h-20 text-accent-gold mx-auto mb-6 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
               <h2 className="text-5xl font-black text-white mb-2">أبطال المسابقات</h2>
               <p className="text-white/40 text-lg uppercase tracking-widest">تاريخ الفوز والتميز في مدرسة عماد الدين زنكي</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
               {pastWinners.length > 0 ? pastWinners.map((w, idx) => (
                 <div key={idx} className="bg-dark-surface p-8 rounded-[40px] border border-white/5 flex flex-row-reverse gap-8 items-center bg-gradient-to-br from-white/[0.02] to-transparent">
                    {w.prizeImageUrl ? (
                      <img src={w.prizeImageUrl} alt="Prize" className="w-24 h-24 rounded-3xl object-cover border-2 border-accent-gold" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center">
                        <Award className="w-10 h-10 text-accent-gold" />
                      </div>
                    )}
                    <div className="flex-grow text-right">
                       <div className="text-accent-gold text-xs font-bold uppercase mb-2 tracking-widest">{w.compTitle}</div>
                       <h3 className="text-3xl font-black mb-3">{w.winnerName}</h3>
                       <div className="flex flex-row-reverse items-center justify-end gap-3 text-white/40 text-sm">
                          <span>{w.winnerGrade}</span>
                          <span>•</span>
                          <span>فصل: {w.winnerSection}</span>
                       </div>
                    </div>
                 </div>
               )) : (
                 <div className="col-span-full py-20 text-center text-white/20 italic">
                   يتم تجميع أسماء الأبطال حالياً...
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Ad Bar */}
      <footer className="h-[100px] bg-gradient-to-r from-transparent via-neon-cyan/5 to-transparent border-t border-white/5 flex items-center justify-center gap-10 text-sm opacity-60 tracking-wider">
        {competition.adImageUrl && (
          <div className="flex flex-row-reverse items-center gap-4">
             <span>مساحة إعلانية: {competition.title}</span>
             <a href={competition.adLink} target="_blank" rel="noreferrer" className="text-neon-cyan font-bold">سجل الآن</a>
          </div>
        )}
      </footer>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-dark-surface border border-neon-purple/30 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl"
            >
              <AlertCircle className="w-16 h-16 text-neon-purple mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-4">تأكيد الإرسال</h3>
              <p className="text-white/60 mb-8 text-lg">هل أنت متأكد من رغبتك في إرسال الإجابة؟ لا يمكنك التعديل بعد الإرسال.</p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setIsConfirming(false);
                    handleSendAnswer();
                  }}
                  className="flex-1 bg-neon-purple text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-[0_0_20px_rgba(188,19,254,0.3)]"
                >
                  نعم، متأكد
                </button>
                <button
                  onClick={() => setIsConfirming(false)}
                  className="flex-1 bg-white/5 text-white font-bold py-4 rounded-xl hover:bg-white/10 transition-all"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminView() {
  const [competition, setCompetition] = useState<CompetitionData | null>(null);
  const [stats, setStats] = useState({ totalAnswers: 0, correctAnswers: 0 });
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [copying, setCopying] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem("eduwin_student");
    let manualId = "";
    if (saved) {
      const p = JSON.parse(saved);
      manualId = p.uid;
    }

    const checkAdmin = async (uid: string) => {
      if (!uid) return false;
      const adminDoc = await getDoc(doc(db, "admins", uid));
      return adminDoc.exists();
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      let isAdm = false;
      if (user) {
        isAdm = await checkAdmin(user.uid);
      }
      
      // If auth check failed, check manual/local ID
      if (!isAdm && manualId) {
        isAdm = await checkAdmin(manualId);
      }
      
      setIsAdmin(isAdm);
    });
    return () => unsub();
  }, []);

  const copyStudentLink = () => {
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(baseUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const [options, setOptions] = useState<{ id: string; text: string; isCorrect: boolean }[]>([
    { id: "1", text: "", isCorrect: false }
  ]);
  const [newComp, setNewComp] = useState({
    title: "",
    question: "",
    questionType: "text" as QuestionType,
    questionImageUrl: "",
    prizeImageUrl: "",
    adImageUrl: "",
    adLink: "",
    correctAnswer: ""
  });

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { id: Date.now().toString(), text: "", isCorrect: false }]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 1) {
      setOptions(options.filter(o => o.id !== id));
    }
  };

  const updateOptionText = (id: string, text: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
  };

  const toggleOptionCorrect = (id: string) => {
    if (newComp.questionType === "mcq") {
      setOptions(options.map(o => ({ ...o, isCorrect: o.id === id })));
    } else {
      setOptions(options.map(o => o.id === id ? { ...o, isCorrect: !o.isCorrect } : o));
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "competitions"), (snapshot) => {
      if (!snapshot.empty) {
        // Get the most recent active or finished comp
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CompetitionData));
        const current = docs.sort((a, b) => new Date(b.endTime || 0).getTime() - new Date(a.endTime || 0).getTime())[0];
        setCompetition(current);
      }
    });

    return () => unsub();
  }, []);

  const [answers, setAnswers] = useState<any[]>([]);

  useEffect(() => {
    if (competition) {
      const unsub = onSnapshot(collection(db, `competitions/${competition.id}/answers`), (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAnswers(docs);
        setStats({
          totalAnswers: docs.length,
          correctAnswers: docs.filter((a: any) => a.isCorrect).length
        });
      });
      return () => unsub();
    }
  }, [competition?.id]);

  const toggleCorrect = async (answerId: string, current: boolean) => {
    if (!competition) return;
    await setDoc(doc(db, `competitions/${competition.id}/answers`, answerId), { isCorrect: !current, reviewed: true }, { merge: true });
  };

  const handleStartComp = async () => {
    if (!newComp.title || !newComp.question) {
      alert("يرجى إكمال عنوان المسابقة والسؤال");
      return;
    }
    
    setLoading(true);
    try {
      const compId = "comp_" + Date.now();
      const endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      
      const finalOptions = (newComp.questionType === "mcq" || newComp.questionType === "multi") 
        ? options.filter(o => o.text.trim() !== "").map(o => o.text.trim()) 
        : [];
      
      const correctOnes = options.filter(o => o.isCorrect).map(o => o.text.trim());
      const finalCorrectAnswer = newComp.questionType === "text" 
        ? newComp.correctAnswer 
        : correctOnes.join(", ");

      await setDoc(doc(db, "competitions", compId), {
        ...newComp,
        options: finalOptions,
        correctAnswer: finalCorrectAnswer,
        status: "active",
        endTime,
        createdAt: new Date().toISOString()
      });
      
      // Reset form
      setNewComp({
        title: "",
        question: "",
        questionType: "text",
        questionImageUrl: "",
        prizeImageUrl: "",
        adImageUrl: "",
        adLink: "",
        correctAnswer: ""
      });
      setOptions([{ id: "1", text: "", isCorrect: false }]);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrawWinner = async () => {
    if (!competition) return;
    if (confirm("هل أنت متأكد من بدء السحب وإغلاق المسابقة؟")) {
      setLoading(true);
      try {
        await setDoc(doc(db, "competitions", competition.id), { status: "drawing" }, { merge: true });
        await new Promise(r => setTimeout(r, 5000));
        
        const q = query(collection(db, `competitions/${competition.id}/answers`), where("isCorrect", "==", true));
        let snap = await getDocs(q);
        
        let isFallback = false;
        if (snap.empty) {
          const qAll = collection(db, `competitions/${competition.id}/answers`);
          snap = await getDocs(qAll);
          isFallback = true;
        }

        if (snap.empty) {
          alert("لا يوجد مشاركون للسحب الأدنى من بينهم!");
          await setDoc(doc(db, "competitions", competition.id), { status: "active" }, { merge: true });
          return;
        }

        const randomIdx = Math.floor(Math.random() * snap.docs.length);
        const winner = snap.docs[randomIdx].data();
        
        await setDoc(doc(db, "competitions", competition.id), {
          status: "finished",
          winnerId: winner.studentId,
          winnerName: winner.studentName,
          winnerGrade: winner.grade,
          winnerSection: winner.section,
          note: isFallback ? "تم السحب من جميع المشاركين لعدم وجود إجابة صحيحة" : ""
        }, { merge: true });

        confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.6 },
          colors: ["#00f3ff", "#bc13fe", "#ffd700"]
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-dark-surface p-10 rounded-[40px] border border-red-500/30 text-center max-w-md shadow-2xl">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
          <h2 className="text-3xl font-black text-white mb-4">وصول مرفوض</h2>
          <p className="text-white/40 mb-8 leading-relaxed">ليس لديك صلاحيات الوصول لصفحة الإدارة. يرجى تسجيل الدخول بحساب مسؤول من الصفحة الرئيسية.</p>
          <button 
            onClick={() => window.location.href = "/"} 
            className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 transition-all"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin === null) return <LoadingScreen />;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10" dir="rtl">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-dark-surface/50 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-neon-cyan/10 rounded-2xl border border-neon-cyan/20">
            <LayoutDashboard className="w-8 h-8 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">لوحة التحكم الاحترافية</h1>
            <p className="text-white/40 text-sm">أهلاً بك في نظام إدارة المسابقات التعليمية</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={copyStudentLink}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-neon-cyan text-dark-bg font-bold transition-all hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]"
          >
            {copying ? <Check className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
            {copying ? "تم نسخ الرابط" : "نسخ رابط الطلاب"}
          </button>

          <button 
            onClick={() => {
              auth.signOut();
              localStorage.removeItem("eduwin_student");
              window.location.href = "/";
            }}
            className="p-3 rounded-2xl bg-white/5 text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all border border-white/5"
            title="تسجيل الخروج"
          >
            <X className="w-6 h-6" />
          </button>

          <img 
            src={LOGO_URL} 
            alt="Logo" 
            className="w-16 h-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left Column: Stats & Setup */}
        <div className="xl:col-span-8 space-y-10">
          
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="bg-dark-surface p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-neon-cyan/5 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-150" />
               <Users className="w-8 h-8 text-neon-cyan mb-4 relative z-10" />
               <div className="text-4xl font-black text-white relative z-10">{stats.totalAnswers}</div>
               <div className="text-white/40 text-xs font-bold uppercase tracking-widest relative z-10">إجمالي المشاركين</div>
            </div>
            
            <div className="bg-dark-surface p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-150" />
               <CheckCircle className="w-8 h-8 text-green-500 mb-4 relative z-10" />
               <div className="text-4xl font-black text-white relative z-10">{stats.correctAnswers}</div>
               <div className="text-white/40 text-xs font-bold uppercase tracking-widest relative z-10">إجابات نموذجية</div>
            </div>

            <div className="bg-dark-surface p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group md:col-span-1 sm:col-span-2">
               <div className="absolute top-0 right-0 w-24 h-24 bg-neon-purple/5 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-150" />
               <Clock className="w-8 h-8 text-neon-purple mb-4 relative z-10" />
               <div className="text-4xl font-black text-white relative z-10">
                {competition?.status === "active" ? "نشط" : "متوقف"}
               </div>
               <div className="text-white/40 text-xs font-bold uppercase tracking-widest relative z-10">حالة البث المباشر</div>
            </div>
          </div>

          {/* Creation Form */}
          <section className="bg-dark-surface p-8 md:p-10 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-purple to-transparent opacity-50" />
            
            <h2 className="text-2xl font-black mb-10 flex items-center gap-4 justify-end">
              <span className="bg-neon-purple/10 text-neon-purple px-4 py-1 rounded-lg text-sm border border-neon-purple/20">المرحلة الأولى</span>
              إعداد المسابقة الذكية
            </h2>

            <div className="space-y-10">
              {/* Title & Question */}
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ضع عنواناً حماسياً للمسابقة..."
                    value={newComp.title}
                    onChange={(e) => setNewComp({ ...newComp, title: e.target.value })}
                    className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-neon-purple transition-all text-right text-lg placeholder:text-white/20"
                  />
                </div>
                <textarea
                  placeholder="اكتب نص السؤال هنا بدقة..."
                  value={newComp.question}
                  onChange={(e) => setNewComp({ ...newComp, question: e.target.value })}
                  className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-neon-purple transition-all min-h-[150px] text-right text-lg placeholder:text-white/20"
                />
              </div>

              {/* Advanced Config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-black/20 rounded-3xl border border-white/5">
                <div className="space-y-4">
                  <label className="text-sm font-bold text-white/40 block text-right">نوع السؤال</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: "text", label: "سؤال مقالي", icon: Send },
                      { id: "mcq", label: "خيار فردي", icon: CheckCircle },
                      { id: "multi", label: "خيارات متعددة", icon: LayoutDashboard },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setNewComp({ ...newComp, questionType: t.id as QuestionType })}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all text-right",
                          newComp.questionType === t.id 
                            ? "bg-neon-purple/20 border-neon-purple text-white shadow-[0_0_15px_rgba(188,19,254,0.1)]" 
                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                        )}
                      >
                        <t.icon className={cn("w-5 h-5", newComp.questionType === t.id ? "text-neon-purple" : "text-white/20")} />
                        <span className="font-bold">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-white/40 block text-right">المرفقات البصرية</label>
                  <input
                    type="text"
                    placeholder="رابط صورة السؤال"
                    value={newComp.questionImageUrl}
                    onChange={(e) => setNewComp({ ...newComp, questionImageUrl: e.target.value })}
                    className="w-full bg-white/5 border-2 border-white/5 rounded-xl px-5 py-4 outline-none focus:border-neon-cyan text-right text-sm"
                  />
                  <input
                    type="text"
                    placeholder="رابط صورة الجائزة"
                    value={newComp.prizeImageUrl}
                    onChange={(e) => setNewComp({ ...newComp, prizeImageUrl: e.target.value })}
                    className="w-full bg-white/5 border-2 border-white/5 rounded-xl px-5 py-4 outline-none focus:border-neon-cyan text-right text-sm"
                  />
                </div>
              </div>

              {/* Options Setup (Smart Management) */}
              {(newComp.questionType === "mcq" || newComp.questionType === "multi") && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-row-reverse">
                    <h3 className="text-lg font-bold text-neon-cyan">خيارات الإجابة والتحقق</h3>
                    <div className="text-xs text-white/40">يمكنك إضافة حتى 6 خيارات وتحديد الإجابات الصحيحة</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                      {options.map((opt, idx) => (
                        <motion.div
                          key={opt.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-2 group"
                        >
                          <button
                            onClick={() => removeOption(opt.id)}
                            className="p-3 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          
                          <div className="flex-grow flex items-center bg-white/5 rounded-xl border border-white/10 overflow-hidden focus-within:border-neon-cyan transition-all">
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => updateOptionText(opt.id, e.target.value)}
                              placeholder={`الخيار ${idx + 1}...`}
                              className="flex-grow bg-transparent px-4 py-4 outline-none text-right text-white"
                            />
                            <button
                              onClick={() => toggleOptionCorrect(opt.id)}
                              className={cn(
                                "px-5 h-full flex items-center justify-center transition-all border-l border-white/10",
                                opt.isCorrect ? "bg-green-500 text-black" : "bg-black/40 text-white/20 hover:text-green-500"
                              )}
                              title="تحديد كإجابة صحيحة"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {options.length < 6 && (
                      <button
                        onClick={addOption}
                        className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-white/10 rounded-xl text-white/40 hover:border-neon-cyan hover:text-neon-cyan transition-all"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="font-bold">إضافة خيار جديد</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Manual Correct Answer (For Text type) */}
              {newComp.questionType === "text" && (
                <div className="space-y-4">
                   <label className="text-sm font-bold text-white/40 block text-right">الإجابة النموذجية المرجعية</label>
                   <input
                    type="text"
                    placeholder="ما هي الكلمة المفتاحية للإجابة الصحيحة؟"
                    value={newComp.correctAnswer}
                    onChange={(e) => setNewComp({ ...newComp, correctAnswer: e.target.value })}
                    className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-white/20 text-right"
                  />
                </div>
              )}

              {/* Ads & Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-neon-cyan/5 rounded-3xl border border-neon-cyan/10">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-neon-cyan/60 uppercase tracking-widest block text-right">المحتوى الإعلاني</span>
                  <input
                    type="text"
                    placeholder="رابط صورة للإعلان الجانبي"
                    value={newComp.adImageUrl}
                    onChange={(e) => setNewComp({ ...newComp, adImageUrl: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-neon-cyan text-right text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-neon-cyan/60 uppercase tracking-widest block text-right">رابط توجيه</span>
                   <input
                    type="text"
                    placeholder="رابط صفحة أو فيديو (يفتح عند الضغط)"
                    value={newComp.adLink}
                    onChange={(e) => setNewComp({ ...newComp, adLink: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-neon-cyan text-right text-sm"
                  />
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartComp}
                disabled={loading || competition?.status === "active"}
                className="w-full group relative overflow-hidden bg-white text-black font-black py-6 rounded-2xl hover:bg-neon-cyan transition-all shadow-2xl disabled:opacity-50 disabled:grayscale"
              >
                <div className="flex items-center justify-center gap-4 relative z-10 text-xl uppercase tracking-[2px]">
                  <span>{loading ? "جاري الإطلاق..." : "بدء المسابقة فوراً"}</span>
                  <div className={cn("w-3 h-3 rounded-full bg-neon-purple shadow-[0_0_10px_var(--neon-purple)]", competition?.status === "active" ? "animate-ping" : "invisible")} />
                </div>
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Active Comp & Answers */}
        <div className="xl:col-span-4 space-y-10">
          
          {/* Active Competition Mini Preview */}
          {competition ? (
            <div className="bg-dark-surface rounded-[32px] border border-white/10 shadow-xl overflow-hidden">
               <div className="p-6 bg-gradient-to-br from-neon-purple/20 to-transparent border-b border-white/5 flex flex-row-reverse justify-between items-center">
                  <h3 className="font-black text-neon-purple uppercase tracking-widest text-sm">المسابقة الحالية</h3>
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_var(--green-500)]" />
               </div>
               <div className="p-8 text-right space-y-6">
                  <div>
                    <h4 className="text-xl font-bold mb-2">{competition.title}</h4>
                    <p className="text-white/40 text-sm line-clamp-2">{competition.question}</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleDrawWinner}
                      disabled={loading || competition.status !== "active"}
                      className="w-full py-5 bg-neon-purple text-white font-black rounded-2xl hover:opacity-90 shadow-lg disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3"
                    >
                      <Trophy className="w-6 h-6" />
                      <span>بدء السحب العشوائي</span>
                    </button>
                    
                    {competition.status === "finished" && (
                       <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-center">
                          <div className="text-xs text-green-500/60 font-bold mb-1 uppercase">آخر فائز</div>
                          <div className="text-xl font-black text-green-500">{competition.winnerName}</div>
                          <div className="text-[10px] text-white/40">{competition.winnerGrade} - {competition.winnerSection}</div>
                       </div>
                    )}
                  </div>
               </div>
            </div>
          ) : (
            <div className="bg-white/5 order-dashed border-2 border-white/10 p-10 rounded-[32px] text-center italic text-white/20">
              لا توجد مسابقات نشطة حالياً
            </div>
          )}

          {/* Real-time Answers Feed */}
          <div className="bg-dark-surface rounded-[32px] border border-white/10 shadow-xl overflow-hidden flex flex-col max-h-[700px]">
             <div className="p-6 bg-white/5 border-b border-white/10 flex flex-row-reverse justify-between items-center">
                <h3 className="font-black text-neon-cyan uppercase tracking-widest text-sm">أحدث الإجابات</h3>
                <span className="bg-neon-cyan/20 text-neon-cyan text-[10px] px-2 py-1 rounded-md font-bold">{answers.length} مشارك</span>
             </div>
             
             <div className="flex-grow overflow-y-auto custom-scrollbar divide-y divide-white/5">
                {answers.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center gap-4 text-white/10">
                    <CheckCircle className="w-12 h-12" />
                    <span className="font-bold">في انتظار أول مشاركة...</span>
                  </div>
                ) : (
                  [...answers].reverse().map((a: any) => (
                    <motion.div 
                      layout
                      key={a.id} 
                      className="p-5 hover:bg-white/[0.02] transition-colors flex items-center justify-between group flex-row-reverse"
                    >
                       <div className="text-right space-y-2">
                          <div className="flex flex-row-reverse items-center gap-2">
                             <span className="font-black text-white">{a.studentName}</span>
                             <div className="flex gap-1 flex-row-reverse">
                                <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-white/40">{a.grade}</span>
                                <span className="bg-neon-purple/10 px-2 py-0.5 rounded text-[10px] text-neon-purple">{a.section}</span>
                             </div>
                          </div>
                          <div className="text-sm bg-black/40 p-3 rounded-xl border border-white/5 inline-block text-white/70 min-w-[200px]">
                            {a.answerText}
                          </div>
                       </div>
                       
                       <button
                         onClick={() => toggleCorrect(a.id, a.isCorrect)}
                         className={cn(
                           "flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-2",
                           a.isCorrect 
                            ? "bg-green-500 border-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]" 
                            : "bg-white/5 border-white/10 text-white/20 hover:border-green-500 hover:text-green-500"
                         )}
                       >
                         <Check className="w-6 h-6" />
                       </button>
                    </motion.div>
                  ))
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("eduwin_student");
    let manualId = "";
    if (saved) {
      const p = JSON.parse(saved);
      setStudent(p);
      manualId = p.uid;
    }

    const checkAdmin = async (uid: string) => {
      if (!uid) return false;
      const adminDoc = await getDoc(doc(db, "admins", uid));
      return adminDoc.exists();
    };

    const unsub = onAuthStateChanged(auth, async (user) => {
      let isAdm = false;
      if (user) {
        isAdm = await checkAdmin(user.uid);
      }
      
      if (!isAdm && manualId) {
        isAdm = await checkAdmin(manualId);
      }
      
      setIsAdmin(isAdm);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <Router>
      <div className="min-h-screen bg-dark-bg selection:bg-neon-cyan selection:text-dark-bg">
        {isAdmin && (
          <div className="fixed top-4 left-4 z-[60]">
            <a 
              href="/admin" 
              className="flex items-center gap-2 px-4 py-2 bg-neon-purple text-white rounded-full font-bold shadow-[0_0_15px_rgba(188,19,254,0.4)] hover:scale-105 transition-all text-sm"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </a>
          </div>
        )}
        <Routes>
          <Route path="/" element={
            !student ? <LoginPage onLogin={setStudent} /> : <StudentInterface student={student} />
          } />
          <Route path="/admin" element={<AdminView />} />
        </Routes>
      </div>
    </Router>
  );
}
