import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";

export const generateStudentId = async (courseId: string, courseTitle: string): Promise<string> => {
  // 1. Determine Prefix based on Course
  // Logic: 
  // Course A -> CA
  // Course B -> CB
  // Course C -> CC
  // Course D -> CD
  // Baby -> CBB
  
  let prefix = "C"; 
  const titleUpper = courseTitle.toUpperCase();
  const idLower = courseId.toLowerCase();

  if (titleUpper.includes("COURSE A") || idLower.includes("course-a")) prefix = "CA";
  else if (titleUpper.includes("COURSE B") || idLower.includes("course-b")) prefix = "CB";
  else if (titleUpper.includes("COURSE C") || idLower.includes("course-c")) prefix = "CC";
  else if (titleUpper.includes("COURSE D") || idLower.includes("course-d")) prefix = "CD";
  else if (titleUpper.includes("BABY") || idLower.includes("baby")) prefix = "CBB";
  else prefix = "CN"; // Default Normal

  // 2. Get Thai Year (2 digits)
  const date = new Date();
  const buddhistYear = date.getFullYear() + 543;
  const yearShort = buddhistYear.toString().slice(-2); // e.g., 2568 -> "68"

  const idPrefix = `${prefix}${yearShort}`; // e.g., CA68

  // 3. Generate Running Number using Counters Collection
  // We use a separate 'counters' collection to avoid scanning the entire 'enrollments' collection,
  // which fails due to security rules for non-admin users.
  const counterRef = doc(db, "counters", idPrefix);

  try {
      const newId = await runTransaction(db, async (transaction) => {
          const counterDoc = await transaction.get(counterRef);
          let currentCount = 0;
          
          if (counterDoc.exists()) {
              const data = counterDoc.data();
              currentCount = data.count || 0;
          }
          
          const nextCount = currentCount + 1;
          
          // Set the new count
          transaction.set(counterRef, { count: nextCount }, { merge: true });
          
          return nextCount;
      });

      const runningString = newId.toString().padStart(3, '0'); // 001, 002...

      return `${idPrefix}${runningString}`; // Result: CA68001
  } catch (error) {
      console.error("Error generating ID via counter", error);
      // Fallback: Random 4 digits if transaction fails (e.g. offline)
      // This allows the user to proceed even if the counter system has a momentary issue
      return `${idPrefix}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }
};