import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { getWeek, format } from 'date-fns';

// Types
interface Subject {
  id: string;
  name: string;
  attendance: AttendanceRecord[];
  percentage: number;
}

interface AttendanceRecord {
  present: boolean;
  date: number;
  timeSlot: string;
  dayOfWeek?: number;
}

interface CellData {
  subjectName: string;
  isPresent: boolean | null;
  attendees?: string;
  isHoliday?: boolean;
  dayOfWeek?: number;
}

// Firebase Collection Names
const SUBJECTS_COLLECTION = 'subjects';
const TIMETABLE_COLLECTION = 'timetable';

// Subjects Functions
export const fetchSubjects = async (): Promise<Subject[]> => {
  try {
    const snapshot = await getDocs(collection(db, SUBJECTS_COLLECTION));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Subject[];
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }
};

export const getSubjectById = async (id: string): Promise<Subject | null> => {
  try {
    const docRef = doc(db, SUBJECTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Subject;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting subject:', error);
    return null;
  }
};

export const createOrUpdateSubject = async (subject: Subject): Promise<boolean> => {
  try {
    await setDoc(doc(db, SUBJECTS_COLLECTION, subject.id), subject);
    return true;
  } catch (error) {
    console.error('Error saving subject:', error);
    return false;
  }
};

export const deleteSubject = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, SUBJECTS_COLLECTION, id));
    return true;
  } catch (error) {
    console.error('Error deleting subject:', error);
    return false;
  }
};

// Timetable Functions
export const fetchTimetable = async (): Promise<Record<string, Record<string, CellData>>> => {
  try {
    const snapshot = await getDocs(collection(db, TIMETABLE_COLLECTION));
    const timetableData: Record<string, Record<string, CellData>> = {};
    
    snapshot.forEach(document => {
      // We store the timetable with document IDs like "week-38-2023"
      const weekKey = document.id;
      timetableData[weekKey] = document.data() as Record<string, CellData>;
    });
    
    return timetableData;
  } catch (error) {
    console.error('Error fetching timetable:', error);
    return {};
  }
};

export const updateWeekTimetable = async (
  weekKey: string,
  weekData: Record<string, CellData>
): Promise<boolean> => {
  try {
    await setDoc(doc(db, TIMETABLE_COLLECTION, weekKey), weekData);
    return true;
  } catch (error) {
    console.error('Error updating week timetable:', error);
    return false;
  }
};

export const updateEntireTimetable = async (
  timetableData: Record<string, Record<string, CellData>>
): Promise<boolean> => {
  try {
    // First delete existing timetable data
    const snapshot = await getDocs(collection(db, TIMETABLE_COLLECTION));
    const deletePromises = snapshot.docs.map(document => 
      deleteDoc(doc(db, TIMETABLE_COLLECTION, document.id))
    );
    await Promise.all(deletePromises);
    
    // Then add new timetable data
    const updatePromises: Promise<void>[] = [];
    
    Object.entries(timetableData).forEach(([weekKey, weekData]) => {
      updatePromises.push(
        setDoc(doc(db, TIMETABLE_COLLECTION, weekKey), weekData)
      );
    });
    
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error('Error updating entire timetable:', error);
    return false;
  }
};

// Helper Functions
export const loadDemoData = async (): Promise<boolean> => {
  try {
    // Current date for demo data
    const now = new Date();
    const currentWeek = getWeek(now);
    const currentYear = now.getFullYear();
    const weekKey = `week-${currentWeek}-${currentYear}`;
    
    // Sample subjects
    const demoSubjects: Subject[] = [
      { 
        id: '1', 
        name: 'Mathematics', 
        percentage: 85, 
        attendance: [
          { present: true, date: now.getTime(), timeSlot: '9:00 AM', dayOfWeek: 1 },
          { present: true, date: now.getTime(), timeSlot: '11:00 AM', dayOfWeek: 3 }
        ] 
      },
      { 
        id: '2', 
        name: 'Physics', 
        percentage: 70, 
        attendance: [
          { present: true, date: now.getTime(), timeSlot: '10:00 AM', dayOfWeek: 2 },
          { present: false, date: now.getTime(), timeSlot: '2:00 PM', dayOfWeek: 4 }
        ] 
      },
      { 
        id: '3', 
        name: 'Computer Science', 
        percentage: 90, 
        attendance: [
          { present: true, date: now.getTime(), timeSlot: '1:00 PM', dayOfWeek: 1 },
          { present: true, date: now.getTime(), timeSlot: '3:00 PM', dayOfWeek: 5 }
        ] 
      },
      { 
        id: '4', 
        name: 'Chemistry', 
        percentage: 75, 
        attendance: [
          { present: true, date: now.getTime(), timeSlot: '2:00 PM', dayOfWeek: 2 },
          { present: false, date: now.getTime(), timeSlot: '11:00 AM', dayOfWeek: 4 }
        ] 
      },
      { 
        id: '5', 
        name: 'English', 
        percentage: 80, 
        attendance: [
          { present: true, date: now.getTime(), timeSlot: '9:00 AM', dayOfWeek: 3 },
          { present: true, date: now.getTime(), timeSlot: '10:00 AM', dayOfWeek: 5 }
        ] 
      }
    ];
    
    // Sample timetable (weekly format)
    const demoWeekData: Record<string, CellData> = {
      // Monday classes
      'day-1-9:00 AM': { subjectName: 'Mathematics', isPresent: true, dayOfWeek: 1 },
      'day-1-10:00 AM': { subjectName: 'English', isPresent: null, dayOfWeek: 1 },
      'day-1-11:00 AM': { subjectName: 'Chemistry', isPresent: null, dayOfWeek: 1 },
      'day-1-12:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 1 },
      'day-1-1:00 PM': { subjectName: 'Computer Science', isPresent: true, dayOfWeek: 1 },
      'day-1-2:00 PM': { subjectName: 'Physics', isPresent: null, dayOfWeek: 1 },
      'day-1-3:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 1 },
      'day-1-4:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 1 },
      'day-1-5:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 1 },
      
      // Tuesday classes
      'day-2-9:00 AM': { subjectName: 'Chemistry', isPresent: null, dayOfWeek: 2 },
      'day-2-10:00 AM': { subjectName: 'Physics', isPresent: true, dayOfWeek: 2 },
      'day-2-11:00 AM': { subjectName: 'English', isPresent: null, dayOfWeek: 2 },
      'day-2-12:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 2 },
      'day-2-1:00 PM': { subjectName: 'Mathematics', isPresent: null, dayOfWeek: 2 },
      'day-2-2:00 PM': { subjectName: 'Chemistry', isPresent: true, dayOfWeek: 2 },
      'day-2-3:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 2 },
      'day-2-4:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 2 },
      'day-2-5:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 2 },
      
      // Wednesday classes
      'day-3-9:00 AM': { subjectName: 'English', isPresent: true, dayOfWeek: 3 },
      'day-3-10:00 AM': { subjectName: 'Computer Science', isPresent: null, dayOfWeek: 3 },
      'day-3-11:00 AM': { subjectName: 'Mathematics', isPresent: true, dayOfWeek: 3 },
      'day-3-12:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 3 },
      'day-3-1:00 PM': { subjectName: 'Physics', isPresent: null, dayOfWeek: 3 },
      'day-3-2:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 3 },
      'day-3-3:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 3 },
      'day-3-4:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 3 },
      'day-3-5:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 3 },
      
      // Thursday classes
      'day-4-9:00 AM': { subjectName: 'Computer Science', isPresent: null, dayOfWeek: 4 },
      'day-4-10:00 AM': { subjectName: 'Chemistry', isPresent: null, dayOfWeek: 4 },
      'day-4-11:00 AM': { subjectName: 'Chemistry', isPresent: false, dayOfWeek: 4 },
      'day-4-12:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 4 },
      'day-4-1:00 PM': { subjectName: 'English', isPresent: null, dayOfWeek: 4 },
      'day-4-2:00 PM': { subjectName: 'Physics', isPresent: false, dayOfWeek: 4 },
      'day-4-3:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 4 },
      'day-4-4:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 4 },
      'day-4-5:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 4 },
      
      // Friday classes
      'day-5-9:00 AM': { subjectName: 'Physics', isPresent: null, dayOfWeek: 5 },
      'day-5-10:00 AM': { subjectName: 'English', isPresent: true, dayOfWeek: 5 },
      'day-5-11:00 AM': { subjectName: 'Computer Science', isPresent: null, dayOfWeek: 5 },
      'day-5-12:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 5 },
      'day-5-1:00 PM': { subjectName: 'Mathematics', isPresent: null, dayOfWeek: 5 },
      'day-5-2:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 5 },
      'day-5-3:00 PM': { subjectName: 'Computer Science', isPresent: true, dayOfWeek: 5 },
      'day-5-4:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 5 },
      'day-5-5:00 PM': { subjectName: '', isPresent: null, dayOfWeek: 5 }
    };
    
    // The week data is stored as a single document with a weekKey
    const demoTimetable: Record<string, Record<string, CellData>> = {
      [weekKey]: demoWeekData
    };
    
    // Add subjects to Firestore
    for (const subject of demoSubjects) {
      await createOrUpdateSubject(subject);
    }
    
    // Add timetable to Firestore
    await updateEntireTimetable(demoTimetable);
    
    return true;
  } catch (error) {
    console.error('Error loading demo data:', error);
    return false;
  }
}; 