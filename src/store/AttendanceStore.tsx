import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  fetchSubjects, 
  createOrUpdateSubject, 
  deleteSubject as deleteFirestoreSubject,
  fetchTimetable,
  updateEntireTimetable
} from '../services/firebaseService';

interface AttendanceRecord {
  present: boolean;
  date: number;
  timeSlot: string;
  dayOfWeek?: number;
}

interface Subject {
  id: string;
  name: string;
  attendance: AttendanceRecord[];
  percentage: number;
}

interface CellData {
  subjectName: string;
  isPresent: boolean | null;
  attendees?: string;
  isHoliday?: boolean;
  dayOfWeek?: number;
}

interface AttendanceGoal {
  currentAttendance: number;
  totalClasses: number;
  classesAttended: number;
  classesNeeded: number;
  isPossible: boolean;
  remainingClasses: number;
  totalNeeded: number;
  futureProjection: number;
  weeklyClasses: number;
  weeksNeeded: number;
}

interface AttendanceContextType {
  subjects: Subject[];
  currentSubject: string;
  timetableData: Record<string, Record<string, CellData>>;
  addSubject: (subject: Subject) => void;
  updateSubject: (id: string, updatedSubject: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  setCurrentSubject: (subjectName: string) => void;
  getSubjectById: (id: string) => Subject | undefined;
  getSubjectByName: (name: string) => Subject | undefined;
  updateTimetableData: (data: Record<string, Record<string, CellData>>) => void;
  calculateAttendanceGoal: (subjectId: string, targetPercentage?: number) => AttendanceGoal;
  isSubjectCritical: (subject: Subject) => boolean;
  isLoading: boolean;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};

interface AttendanceProviderProps {
  children: ReactNode;
}

export const AttendanceProvider: React.FC<AttendanceProviderProps> = ({ children }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSubject, setCurrentSubject] = useState<string>('');
  const [timetableData, setTimetableData] = useState<Record<string, Record<string, CellData>>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch subjects from Firebase
        const subjectsData = await fetchSubjects();
        setSubjects(subjectsData);
        
        // Fetch timetable from Firebase
        const timetableData = await fetchTimetable();
        setTimetableData(timetableData);
      } catch (error) {
        console.error('Error loading data from Firebase:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const addSubject = async (subject: Subject) => {
    // Ensure subject has an ID
    const subjectWithId = subject.id ? subject : { ...subject, id: uuidv4() };
    
    try {
      // Save to Firebase
      await createOrUpdateSubject(subjectWithId);
      
      // Update local state
      setSubjects(prev => {
        // Check if subject already exists (by ID)
        const exists = prev.some(s => s.id === subjectWithId.id);
        if (exists) {
          // Update existing subject
          return prev.map(s => s.id === subjectWithId.id ? subjectWithId : s);
        }
        // Add new subject
        return [...prev, subjectWithId];
      });
    } catch (error) {
      console.error('Error adding subject:', error);
    }
  };

  const updateSubject = async (id: string, updatedSubject: Partial<Subject>) => {
    try {
      // Find the current subject
      const currentSubject = subjects.find(s => s.id === id);
      if (!currentSubject) return;
      
      // Merge with updates
      const mergedSubject = { ...currentSubject, ...updatedSubject };
      
      // Save to Firebase
      await createOrUpdateSubject(mergedSubject);
      
      // Update local state
      setSubjects(prev => 
        prev.map(subject => 
          subject.id === id ? { ...subject, ...updatedSubject } : subject
        )
      );
    } catch (error) {
      console.error('Error updating subject:', error);
    }
  };

  const deleteSubject = async (id: string) => {
    try {
      // Delete from Firebase
      await deleteFirestoreSubject(id);
      
      // Update local state
      setSubjects(prev => prev.filter(subject => subject.id !== id));
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  };

  const getSubjectById = (id: string) => {
    return subjects.find(subject => subject.id === id);
  };

  const getSubjectByName = (name: string) => {
    return subjects.find(subject => subject.name === name);
  };

  const updateTimetableData = async (data: Record<string, Record<string, CellData>>) => {
    try {
      // Save to Firebase
      await updateEntireTimetable(data);
      
      // Update local state
      setTimetableData(data);
    } catch (error) {
      console.error('Error updating timetable:', error);
    }
  };

  // Count how many classes of a subject occur in a week
  const getWeeklyClassCount = (subjectName: string): number => {
    // Track classes per day of week
    const classesPerDay: Record<number, number> = {
      0: 0, // Sunday
      1: 0, // Monday
      2: 0, // Tuesday
      3: 0, // Wednesday
      4: 0, // Thursday
      5: 0, // Friday
      6: 0  // Saturday
    };
    
    // Count classes for each day of the week
    if (!timetableData) return 0;
    
    Object.values(timetableData).forEach(day => {
      if (!day) return;
      
      Object.values(day).forEach(cell => {
        if (cell && cell.subjectName === subjectName && !cell.isHoliday && cell.dayOfWeek !== undefined) {
          classesPerDay[cell.dayOfWeek]++;
        }
      });
    });
    
    // Sum up weekly classes
    return Object.values(classesPerDay).reduce((total, count) => total + count, 0);
  };

  // Enhanced function to calculate classes needed to reach 75% attendance
  const calculateAttendanceGoal = (subjectId: string, targetPercentage: number = 75): AttendanceGoal => {
    const subject = getSubjectById(subjectId);
    
    if (!subject) {
      return {
        currentAttendance: 0,
        totalClasses: 0,
        classesAttended: 0,
        classesNeeded: 0,
        isPossible: false,
        remainingClasses: 0,
        totalNeeded: 0,
        futureProjection: 0,
        weeklyClasses: 0,
        weeksNeeded: 0
      };
    }
    
    // Count total and remaining classes for this subject in the timetable
    let totalScheduledClasses = 0;
    let remainingClasses = 0;
    let attendedClasses = 0;
    let absentClasses = 0;
    
    // Scan through timetable to count classes
    if (!timetableData) {
      // Return default values if timetable data is missing
      return {
        currentAttendance: subject.percentage || 0,
        totalClasses: 0,
        classesAttended: 0,
        classesNeeded: 0,
        isPossible: false,
        remainingClasses: 0,
        totalNeeded: 0,
        futureProjection: 0,
        weeklyClasses: 0,
        weeksNeeded: 0
      };
    }
    
    Object.values(timetableData).forEach(day => {
      if (!day) return;
      
      Object.values(day).forEach(cell => {
        if (cell && cell.subjectName === subject.name && !cell.isHoliday) {
          totalScheduledClasses++;
          
          // If attendance not marked yet, it's a remaining class
          if (cell.isPresent === null) {
            remainingClasses++;
          } else if (cell.isPresent === false) {
            absentClasses++;
          } else if (cell.isPresent === true) {
            attendedClasses++;
          }
        }
      });
    });
    
    // Current percentage based on held classes
    const heldClasses = attendedClasses + absentClasses;
    const currentPercentage = heldClasses > 0 
      ? Math.round((attendedClasses / heldClasses) * 100) 
      : 0;
    
    // Calculate how many classes needed to reach target overall
    const totalClassesForTarget = Math.ceil((targetPercentage * totalScheduledClasses) / 100);
    const totalNeeded = totalClassesForTarget;
    
    // How many more classes need to be attended to reach target
    const additionalClassesNeeded = Math.max(0, totalClassesForTarget - attendedClasses);
    
    // Check if it's still possible to reach the target
    const isPossible = additionalClassesNeeded <= remainingClasses;
    
    // Calculate what percentage will be if all remaining classes are attended
    const bestCaseAttended = attendedClasses + remainingClasses;
    const futureProjection = totalScheduledClasses > 0 
      ? Math.round((bestCaseAttended / totalScheduledClasses) * 100) 
      : 0;
    
    // Get weekly class count
    const weeklyClasses = getWeeklyClassCount(subject.name);
    
    // Calculate weeks needed (rounded up)
    const weeksNeeded = weeklyClasses > 0 
      ? Math.ceil(additionalClassesNeeded / weeklyClasses) 
      : 0;
    
    return {
      currentAttendance: currentPercentage,
      totalClasses: totalScheduledClasses,
      classesAttended: attendedClasses,
      classesNeeded: additionalClassesNeeded,
      isPossible,
      remainingClasses,
      totalNeeded,
      futureProjection,
      weeklyClasses,
      weeksNeeded
    };
  };

  const isSubjectCritical = (subject: Subject): boolean => {
    // A subject is critical if attendance is below 75%
    return subject.percentage < 75;
  };

  return (
    <AttendanceContext.Provider value={{
      subjects,
      currentSubject,
      timetableData,
      addSubject,
      updateSubject,
      deleteSubject,
      setCurrentSubject,
      getSubjectById,
      getSubjectByName,
      updateTimetableData,
      calculateAttendanceGoal,
      isSubjectCritical,
      isLoading
    }}>
      {children}
    </AttendanceContext.Provider>
  );
};

export default AttendanceProvider; 