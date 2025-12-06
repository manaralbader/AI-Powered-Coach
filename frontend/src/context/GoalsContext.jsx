import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const GoalsContext = createContext();

export const useGoals = () => {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
};

// Helper function to load goals data from localStorage once (fallback)
const loadGoalsData = () => {
  const savedData = localStorage.getItem('goalsData');
  if (savedData) {
    try {
      return JSON.parse(savedData);
    } catch (error) {
      console.error('Error parsing saved goals data:', error);
      return null;
    }
  }
  return null;
};

export const GoalsProvider = ({ children }) => {
  const { user, isAuthenticated } = useUser();
  
  // Load data once and extract all values (from localStorage as initial state)
  const initialData = loadGoalsData();
  
  // Initialize state from localStorage if available, otherwise use defaults
  const [currentWeight, setCurrentWeight] = useState(initialData?.currentWeight ?? null);
  const [goalWeight, setGoalWeight] = useState(initialData?.goalWeight ?? null);
  const [initialWeight, setInitialWeight] = useState(initialData?.initialWeight ?? null);
  const [weightHistory, setWeightHistory] = useState(initialData?.weightHistory || []);
  const [goal, setGoal] = useState(initialData?.goal || '');
  const [loading, setLoading] = useState(true);

  // Load goals from Firestore when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const uid = user.uid;

    // Load goals document
    const loadGoals = async () => {
      try {
        const goalsDoc = await getDoc(doc(db, 'goals', uid));
        if (goalsDoc.exists()) {
          const data = goalsDoc.data();
          setCurrentWeight(data.currentWeight ?? null);
          setGoalWeight(data.goalWeight ?? null);
          setInitialWeight(data.initialWeight ?? null);
          setGoal(data.goalType || data.goal || '');
        }
      } catch (error) {
        console.error('Error loading goals:', error);
      }
    };

    // Load weight history
    let unsubscribeHistory;
    
    try {
      unsubscribeHistory = onSnapshot(
        query(
          collection(db, 'weightHistory', uid, 'entries'),
          orderBy('createdAt', 'desc'),
          limit(7)
        ),
        (snapshot) => {
          const history = snapshot.docs.map(doc => ({
            date: doc.data().recordedDate || doc.data().createdAt?.toDate()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            weight: doc.data().weight
          }));
          setWeightHistory(history);
          setLoading(false);
          
          console.log('📊 Loaded weight history:', history.length, 'entries');
          
          // Also save to localStorage as backup
          localStorage.setItem('weightHistory', JSON.stringify(history));
        },
        (error) => {
          console.error('❌ Error loading weight history:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            uid: uid
          });
          
          // If index error, try loading without orderBy
          if (error.code === 'failed-precondition') {
            console.log('⚠️ Index missing, trying without orderBy...');
            // Fallback: load without orderBy
            onSnapshot(
              collection(db, 'weightHistory', uid, 'entries'),
              (snapshot) => {
                const history = snapshot.docs
                  .map(doc => ({
                    date: doc.data().recordedDate || doc.data().createdAt?.toDate()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                    weight: doc.data().weight,
                    createdAt: doc.data().createdAt
                  }))
                  .sort((a, b) => {
                    // Sort by date descending
                    return new Date(b.date) - new Date(a.date);
                  })
                  .slice(0, 7);
                
                setWeightHistory(history);
                setLoading(false);
                localStorage.setItem('weightHistory', JSON.stringify(history));
              },
              (fallbackError) => {
                console.error('❌ Fallback query also failed:', fallbackError);
                setLoading(false);
              }
            );
          } else {
            setLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('❌ Error setting up weight history listener:', error);
      setLoading(false);
    }

    loadGoals();

    return () => {
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, [isAuthenticated, user?.uid]);

  // Save to Firestore whenever state changes (only if user is authenticated)
  useEffect(() => {
    if (!isAuthenticated || !user?.uid || loading) {
      return;
    }

    const saveToFirestore = async () => {
      try {
        const uid = user.uid;
        const userEmail = user.email || '';
        await setDoc(doc(db, 'goals', uid), {
          userId: uid,
          userEmail: userEmail, // Add email to identify the user
          userName: user.name || '', // Add name if available
          currentWeight: currentWeight ?? null,
          goalWeight: goalWeight ?? null,
          initialWeight: initialWeight ?? null,
          goalType: goal || '',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });

        // Also save to localStorage as backup
        const dataToSave = {
          currentWeight,
          goalWeight,
          initialWeight,
          weightHistory,
          goal
        };
        localStorage.setItem('goalsData', JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Error saving goals to Firestore:', error);
        // Still save to localStorage as fallback
        const dataToSave = {
          currentWeight,
          goalWeight,
          initialWeight,
          weightHistory,
          goal
        };
        localStorage.setItem('goalsData', JSON.stringify(dataToSave));
      }
    };

    // Debounce saves to avoid too many writes
    const timeoutId = setTimeout(saveToFirestore, 500);
    return () => clearTimeout(timeoutId);
  }, [currentWeight, goalWeight, initialWeight, goal, isAuthenticated, user?.uid, loading]);

  // Reset goals when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('=== USER LOGGED OUT - RESETTING GOALS ===');
      setCurrentWeight(null);
      setGoalWeight(null);
      setInitialWeight(null);
      setWeightHistory([]);
      setGoal('');
      localStorage.removeItem('goalsData');
    }
  }, [isAuthenticated]);

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!currentWeight || !goalWeight || !initialWeight) return 0;
    
    // For weight LOSS goals (goalWeight < initialWeight)
    if (goalWeight < initialWeight) {
      const totalWeightToLose = initialWeight - goalWeight;
      const weightLostSoFar = initialWeight - currentWeight;
      
      if (totalWeightToLose <= 0) return 100; // Goal reached or exceeded
      
      const progress = (weightLostSoFar / totalWeightToLose) * 100;
      return Math.min(Math.max(progress, 0), 100);
    }
    
    // For weight GAIN goals (goalWeight > initialWeight)
    if (goalWeight > initialWeight) {
      const totalWeightToGain = goalWeight - initialWeight;
      const weightGainedSoFar = currentWeight - initialWeight;
      
      if (totalWeightToGain <= 0) return 100; // Goal reached or exceeded
      
      const progress = (weightGainedSoFar / totalWeightToGain) * 100;
      return Math.min(Math.max(progress, 0), 100);
    }
    
    // If goalWeight === initialWeight, progress is 100% (goal reached)
    return 100;
  };

  // Functions to expose
  const updateCurrentWeight = async (weight, date = null) => {
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      throw new Error('Weight must be a positive number');
    }
    
    setCurrentWeight(weightValue);
    
    // Always use today's date if no date provided, or use provided date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const entryDate = date || today;
    
    // Update local state
    setWeightHistory(prev => {
      // Remove any existing entry for this date
      const filtered = prev.filter(entry => entry.date !== entryDate);
      // Add new entry and keep only last 7 days
      return [...filtered, { date: entryDate, weight: weightValue }].slice(-7);
    });

    // Save to Firestore if authenticated
    if (isAuthenticated && user?.uid) {
      try {
        console.log('💾 Saving weight entry to Firestore:', { weight: weightValue, date: entryDate, uid: user.uid });
        const parentRef = doc(db, 'weightHistory', user.uid);
        await setDoc(parentRef, {
          userId: user.uid,
          userEmail: user.email || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        await addDoc(collection(db, 'weightHistory', user.uid, 'entries'), {
          weight: weightValue,
          recordedDate: entryDate,
          createdAt: serverTimestamp()
        });
        console.log('✅ Weight entry saved successfully');
      } catch (error) {
        console.error('❌ Error saving weight entry to Firestore:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          uid: user.uid
        });
        // Still update local state even if Firestore save fails
      }
    }
  };

  const updateGoalWeight = (weight) => {
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      throw new Error('Goal weight must be a positive number');
    }
    
    if (weightValue < 30 || weightValue > 300) {
      throw new Error('Goal weight must be between 30kg and 300kg');
    }
    
    setGoalWeight(weightValue);
  };

  const setInitialWeightValue = (weight) => {
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      throw new Error('Initial weight must be a positive number');
    }
    
    setInitialWeight(weightValue);
    setCurrentWeight(weightValue); // Set current weight to initial weight
  };

  const updateGoal = (goalType) => {
    // Validate goal type
    const validGoals = ['lose-weight', 'build-muscle', 'maintain-weight'];
    if (!validGoals.includes(goalType)) {
      throw new Error('Invalid goal type');
    }
    setGoal(goalType);
  };

  const getWeightHistory = () => {
    return weightHistory;
  };

  const resetGoals = () => {
    setCurrentWeight(null);
    setGoalWeight(null);
    setInitialWeight(null);
    setWeightHistory([]);
    setGoal('');
    localStorage.removeItem('goalsData');
    
    // Also delete from Firestore if authenticated
    if (isAuthenticated && user?.uid) {
      const goalsRef = doc(db, 'goals', user.uid);
      setDoc(goalsRef, {
        currentWeight: null,
        goalWeight: null,
        initialWeight: null,
        goalType: '',
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(error => {
        console.error('Error resetting goals in Firestore:', error);
      });
    }
  };

  const value = {
    // State
    currentWeight,
    goalWeight,
    initialWeight,
    weightHistory,
    goal,
    progress: calculateProgress(),
    loading,
    
    // Functions
    updateCurrentWeight,
    updateGoalWeight,
    setInitialWeightValue,
    updateGoal,
    getWeightHistory,
    resetGoals,
    calculateProgress
  };

  return (
    <GoalsContext.Provider value={value}>
      {children}
    </GoalsContext.Provider>
  );
};
