import SoundFeedback from './SoundFeedback';

export class ExerciseDetector {
  constructor(addFeedback) {
    this.addFeedback = addFeedback;
    this.currentExercise = null;
    
    this.frameCounts = {
      squat: { stage: 'standing', prevStage: 'standing', count: 0, stableFrames: 0 },
      bicepCurl: { stage: 'extended', prevStage: 'extended', count: 0, stableFrames: 0 },
      frontKick: { stage: 'standing', prevStage: 'standing', count: 0, stableFrames: 0 },
      overheadPress: { stage: 'start', prevStage: 'start', count: 0, stableFrames: 0 },
      lateralRaise: { stage: 'down', prevStage: 'down', count: 0, stableFrames: 0 }
    };
    
    this.repState = {
      squat: 'standing',
      bicepCurl: 'extended',
      frontKick: 'standing',
      overheadPress: 'start',
      lateralRaise: 'down'
    };
    this.repStable = { squat: 0, bicepCurl: 0, frontKick: 0, overheadPress: 0, lateralRaise: 0 };

    this.midwayFlags = {
      squat: false,
      bicepCurl: false,
      frontKick: false,
      overheadPress: false,
      lateralRaise: false
    };

    this.currentKickSide = null;
    
    this.lastRepTime = {
      frontKick: 0
    };

    this.smoothAngles = Object.create(null);
    this.errorStable = Object.create(null);
    this.formErrorFrames = Object.create(null);
    
    this.lastFeedback = {
      rep: 0,
      form: 0,
      encourage: 0
    };
    
    this.STABLE_FRAMES = 3;
    this.FK_STABLE_FRAMES = 2;

    this.sound = new SoundFeedback();
  }

  reset(exercise) {
    this.currentExercise = exercise;
    const state = this.frameCounts[exercise];
    if (state) {
      const initialStage = exercise === 'squat' ? 'standing' : 
                         exercise === 'bicepCurl' ? 'extended' : 
                         exercise === 'frontKick' ? 'standing' : 
                         exercise === 'overheadPress' ? 'start' : 
                         exercise === 'lateralRaise' ? 'down' : 'start';
      state.stage = initialStage;
      state.prevStage = initialStage;
      state.count = 0;
      state.stableFrames = 0;
    }
    if (exercise === 'squat') {
      this.repState.squat = 'standing';
      this.repStable.squat = 0;
      this.midwayFlags.squat = false;
    } else if (exercise === 'bicepCurl') {
      this.repState.bicepCurl = 'extended';
      this.repStable.bicepCurl = 0;
      this.midwayFlags.bicepCurl = false;
    } else if (exercise === 'frontKick') {
      this.repState.frontKick = 'standing';
      this.repStable.frontKick = 0;
      this.midwayFlags.frontKick = false;
      this.currentKickSide = null;
    } else if (exercise === 'overheadPress') {
      this.repState.overheadPress = 'start';
      this.repStable.overheadPress = 0;
      this.midwayFlags.overheadPress = false;
    } else if (exercise === 'lateralRaise') {
      this.repState.lateralRaise = 'down';
      this.repStable.lateralRaise = 0;
      this.midwayFlags.lateralRaise = false;
    }

    if (this.sound) this.sound.resetExercise(exercise);
  }

  getRepCount(exercise) {
    return this.frameCounts[exercise]?.count || 0;
  }

  canGiveFeedback(type) {
    const now = Date.now();
    const cooldowns = { rep: 0, form: 2000, encourage: 800 };
    return (now - this.lastFeedback[type]) >= cooldowns[type];
  }

  markFeedbackGiven(type) {
    this.lastFeedback[type] = Date.now();
  }

  isFormErrorStable(errorKey, hasError) {
    if (!this.formErrorFrames[errorKey]) {
      this.formErrorFrames[errorKey] = 0;
    }
    
    if (hasError) {
      this.formErrorFrames[errorKey]++;
      return this.formErrorFrames[errorKey] >= 5;
    } else {
      this.formErrorFrames[errorKey] = 0;
      return false;
    }
  }

  calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  calculateTorsoAngle(shoulder, hip) {
    const dx = shoulder.x - hip.x;
    const dy = shoulder.y - hip.y;
    const angle = Math.abs(Math.atan2(dx, dy) * 180.0 / Math.PI);
    return angle;
  }

  calculateTorsoAngleToFloor(shoulder, hip) {
    const dx = shoulder.x - hip.x;
    const dy = hip.y - shoulder.y;
    const angle = Math.abs(Math.atan2(dy, dx) * 180.0 / Math.PI);
    return angle;
  }

  calculateNeckAlignmentAngle(head, shoulder, hip) {
    return this.calculateAngle(head, shoulder, hip);
  }

  smooth(name, value, alpha = 0.5) {
    const prev = this.smoothAngles[name];
    const next = prev == null ? value : (alpha * prev + (1 - alpha) * value);
    this.smoothAngles[name] = next;
    return next;
  }

  getRequiredStableFrames(exercise) {
    return exercise === 'frontKick' ? 1 : this.STABLE_FRAMES;
  }

  pickSide(landmarks) {
    const getVis = (idx) => {
      const p = landmarks[idx];
      return p ? (p.visibility == null ? 1 : p.visibility) : 0;
    };
    const leftSum = getVis(11) + getVis(23) + getVis(25) + getVis(27);
    const rightSum = getVis(12) + getVis(24) + getVis(26) + getVis(28);
    return rightSum >= leftSum ? 'right' : 'left';
  }

  testDetection() {}

  updateStability(exercise, newStage) {
    const state = this.frameCounts[exercise];
    const requiredFrames = this.getRequiredStableFrames(exercise);
    if (state.stage !== newStage) {
      state.prevStage = state.stage;
      state.stage = newStage;
      state.stableFrames = 1;
      return false;
    } else {
      state.stableFrames++;
      return state.stableFrames >= requiredFrames;
    }
  }

  detectSquat(landmarks) {
    const side = this.pickSide(landmarks);
    const idx = side === 'right' ? { shoulder: 12, hip: 24, knee: 26, ankle: 28 } : { shoulder: 11, hip: 23, knee: 25, ankle: 27 };
    const hip = landmarks[idx.hip];
    const knee = landmarks[idx.knee];
    const ankle = landmarks[idx.ankle];
    const shoulder = landmarks[idx.shoulder];

    if (!hip || !knee || !ankle || !shoulder) return;

    const visCore = [hip, knee, ankle, shoulder].every(p => (p && (p.visibility == null || p.visibility >= 0.5)));
    if (!visCore) return;

    const kneeAngleRaw = this.calculateAngle(hip, knee, ankle);
    const torsoAngleRaw = this.calculateTorsoAngle(shoulder, hip);
    const hipAngleRaw = this.calculateAngle(shoulder, hip, knee);

    const kneeAngle = this.smooth('squat.knee', kneeAngleRaw, 0.4);
    const torsoAngle = this.smooth('squat.torso', torsoAngleRaw, 0.4);
    const hipAngle = this.smooth('squat.hip', hipAngleRaw, 0.4);
    const ankleRef = landmarks[32] || { x: ankle.x + 0.001, y: ankle.y };
    const ankleAngleRaw = this.calculateAngle(knee, ankle, ankleRef);
    const ankleAngle = this.smooth('squat.ankle', ankleAngleRaw, 0.4);
    
    let newStage;
    
    if (kneeAngle > 150) {
      newStage = 'standing';
    } else if (kneeAngle > 135) {
      newStage = 'descending';
    } else if (kneeAngle > 115) {
      newStage = 'halfway';
    } else if (kneeAngle > 100) {
      newStage = 'deep';
    } else {
      newStage = 'bottom';
    }

    if (kneeAngle > 120 && newStage === 'descending') {
      if (!this.calibration) {
        this.calibration = { squat: { standingHipY: null } };
      }
      
      if (kneeAngle > 150 && !this.calibration.squat.standingHipY) {
        this.calibration.squat.standingHipY = hip.y;
      }
      
      if (this.calibration.squat.standingHipY) {
        const standingHipY = this.calibration.squat.standingHipY;
        const hipDrop = Math.abs(hip.y - standingHipY);
        const torsoLength = Math.abs(shoulder.y - hip.y);
        const normalizedDrop = torsoLength > 0 ? hipDrop / torsoLength : 0;
        
        if (normalizedDrop < 0.05) {
          newStage = 'standing';
        } else if (normalizedDrop < 0.15) {
          newStage = 'descending';
        } else if (normalizedDrop < 0.25) {
          newStage = 'halfway';
        } else if (normalizedDrop < 0.35) {
          newStage = 'deep';
        } else {
          newStage = 'bottom';
        }
      }
    }

    if (!this.updateStability('squat', newStage)) return;

    const state = this.frameCounts.squat;

    if (this.repState.squat === 'standing') {
      if (newStage === 'halfway' || newStage === 'deep' || newStage === 'bottom') {
        this.repState.squat = 'reached_depth';
      }
    } else if (this.repState.squat === 'reached_depth') {
      // User returning to standing after reaching depth - count rep
      if (newStage === 'standing') {
        state.count++;
        this.addFeedback(`Rep ${state.count} complete! 🏋️`, 'success');
        if (this.sound) this.sound.markRep('squat', state.count);
        this.markFeedbackGiven('rep');
        this.repState.squat = 'standing';
        // Reset midway flag when rep completes and user returns to start
        this.midwayFlags.squat = false;
        // Play encouragement every 5 reps
        if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
          this.addFeedback('Keep it up! 💪', 'info');
          this.markFeedbackGiven('encourage');
        }
      }
    }
    
    // send progressive feedback during descent (ONCE per rep)
    if ((newStage === 'halfway' || newStage === 'deep') && !this.midwayFlags.squat && this.canGiveFeedback('encourage')) {
      this.addFeedback('Almost there! 🔥', 'info');
      if (this.sound) this.sound.midwayMaybePlay('squat');
      this.markFeedbackGiven('encourage');
      this.midwayFlags.squat = true; // Set flag to prevent repeated midway sounds
    }

    // form correction: forward lean based on shoulder-hip drift
    const shoulderHipX = Math.abs(shoulder.x - hip.x);
    const hasChestError = (newStage === 'deep' || newStage === 'bottom') && shoulderHipX > 0.2;
    if (hasChestError && this.canGiveFeedback('form')) {
      this.addFeedback('Keep chest up! 📐', 'error');
      if (this.sound) this.sound.play('squat.form', 'squat', { formError: true });
      this.markFeedbackGiven('form');
    } else if (!hasChestError) {
      if (this.sound) this.sound.clearFormError('squat.form', 'squat');
    }
  }

  // detect bicep curl
  detectBicepCurl(landmarks) {
    const shoulder = landmarks[12];
    const elbow = landmarks[14];
    const wrist = landmarks[16];

    if (!shoulder || !elbow || !wrist) return;

    // require core joints visible
    const hip = landmarks[24];
    const visCore = [shoulder, elbow, wrist, hip].every(p => (p && (p.visibility == null || p.visibility >= 0.5)));
    if (!visCore) return;

    const elbowAngleRaw = this.calculateAngle(shoulder, elbow, wrist);
    const torsoUpperArmAngleRaw = this.calculateAngle(hip, shoulder, elbow); // hip-shoulder-elbow

    // smooth angles (reduced alpha since landmarks are pre-smoothed)
    const elbowAngle = this.smooth('curl.elbow', elbowAngleRaw, 0.4);
    const torsoUpperArmAngle = this.smooth('curl.torsoArm', torsoUpperArmAngleRaw, 0.4);
    const shoulderElbowX = Math.abs(shoulder.x - elbow.x);
    
    let newStage;
    
    // Determine stage based on elbow angle
    if (elbowAngle > 160) {
      newStage = 'extended';
    } else if (elbowAngle > 120) {
      newStage = 'curling';
    } else if (elbowAngle > 90) {
      newStage = 'halfway';
    } else if (elbowAngle > 50) {
      newStage = 'almost';
    } else {
      newStage = 'contracted';
    }

    // Check if state is stable
    if (!this.updateStability('bicepCurl', newStage)) return;

    const state = this.frameCounts.bicepCurl;

    // count reps through contracted and extended states
    if (this.repState.bicepCurl === 'extended') {
      if (elbowAngle < 75 && torsoUpperArmAngle < 45) { // slightly relaxed
        this.repStable.bicepCurl += 1;
        if (this.repStable.bicepCurl >= this.STABLE_FRAMES) {
          this.repState.bicepCurl = 'contracted';
          this.repStable.bicepCurl = 0;
        }
      } else {
        this.repStable.bicepCurl = 0;
      }
    } else if (this.repState.bicepCurl === 'contracted') {
      if (elbowAngle >= 170 && elbowAngle <= 185 && torsoUpperArmAngle < 55) {
        this.repStable.bicepCurl += 1;
        if (this.repStable.bicepCurl >= this.STABLE_FRAMES) {
          state.count++;
          this.addFeedback(`Rep ${state.count} complete! 💪`, 'success');
          if (this.sound) this.sound.markRep('bicepCurl', state.count);
          this.markFeedbackGiven('rep');
          this.repState.bicepCurl = 'extended';
          this.repStable.bicepCurl = 0;
          // Reset midway flag when rep completes and user returns to start
          this.midwayFlags.bicepCurl = false;
          // Play encouragement every 5 reps
          if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
            this.addFeedback('Keep it up! 💪', 'info');
            this.markFeedbackGiven('encourage');
          }
        }
      } else {
        this.repStable.bicepCurl = 0;
      }
    }
    
    // send progressive feedback during curl (ONCE per rep at midway point)
    if ((newStage === 'halfway' || newStage === 'almost') && !this.midwayFlags.bicepCurl && this.canGiveFeedback('encourage')) {
      this.addFeedback('Keep going! 🔥', 'info');
      if (this.sound) this.sound.midwayMaybePlay('bicepCurl');
      this.markFeedbackGiven('encourage');
      this.midwayFlags.bicepCurl = true; // Set flag to prevent repeated midway sounds
    }

    // form correction: elbow drift
    const hasElbowDrift = shoulderElbowX > 0.15;
    if (hasElbowDrift && this.canGiveFeedback('form')) {
      this.addFeedback('Keep elbow stable! 📍', 'error');
      if (this.sound) this.sound.play('bicep-curl.form', 'bicepCurl', { formError: true });
      this.markFeedbackGiven('form');
    } else if (!hasElbowDrift) {
      if (this.sound) this.sound.clearFormError('bicep-curl.form', 'bicepCurl');
    }

    // form correction: elbow raised too high
    const hasElbowRaised = elbowAngle < 145 && torsoUpperArmAngle > 50;
    const elbowRaisedStable = this.isFormErrorStable('bicepCurl.elbowRaised', hasElbowRaised);
    if (elbowRaisedStable && this.canGiveFeedback('form')) {
      this.addFeedback('Keep your elbow down! 📍', 'error');
      if (this.sound) this.sound.play('bicep-curl.form', 'bicepCurl', { formError: true });
      this.markFeedbackGiven('form');
    } else if (!hasElbowRaised) {
      if (this.sound) this.sound.clearFormError('bicep-curl.form', 'bicepCurl');
    }
  }

  // detect front kick
  detectFrontKick(landmarks) {
    // Check both legs
    const leftShoulder = landmarks[11];
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    
    const rightShoulder = landmarks[12];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];

    // Check if each side has required landmarks
    const leftOk = leftShoulder && leftHip && leftKnee && leftAnkle;
    const rightOk = rightShoulder && rightHip && rightKnee && rightAnkle;
    
    if (!leftOk && !rightOk) return; // Neither leg visible
    
    // Calculate angles for both legs
    let leftLegAngle = null;
    let rightLegAngle = null;
    
    if (leftOk) {
      leftLegAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    }
    
    if (rightOk) {
      rightLegAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    }
    
    // Determine which leg is kicking (the one that's more bent/extended)
    // If we don't have a current kick side, pick the leg that's more active
    let side;
    
    if (this.currentKickSide === null) {
      // Initial determination: pick the leg that's more bent (smaller angle)
      if (leftOk && rightOk) {
        side = leftLegAngle < rightLegAngle ? 'left' : 'right';
      } else if (leftOk) {
        side = 'left';
      } else {
        side = 'right';
      }
      this.currentKickSide = side;
    } else {
      // Stick with current side unless it becomes invalid
      side = this.currentKickSide;
      
      // Switch sides only if current side is not visible OR if opposite leg becomes significantly more active
      if (side === 'left' && !leftOk && rightOk) {
        side = 'right';
        this.currentKickSide = side;
        this.repState.frontKick = 'standing';
        this.repStable.frontKick = 0;
      } else if (side === 'right' && !rightOk && leftOk) {
        side = 'left';
        this.currentKickSide = side;
        this.repState.frontKick = 'standing';
        this.repStable.frontKick = 0;
      }
    }
    
    const idx = side === 'right' ? { shoulder: 12, hip: 24, knee: 26, ankle: 28 } : { shoulder: 11, hip: 23, knee: 25, ankle: 27 };
    const shoulder = landmarks[idx.shoulder];
    const hip = landmarks[idx.hip];
    const knee = landmarks[idx.knee];
    const ankle = landmarks[idx.ankle];

    if (!shoulder || !hip || !knee || !ankle) return;

    // require core joints visible (more tolerant for fast kicks)
    const visOk = [hip, knee, ankle, shoulder].every(p => (p && (p.visibility == null || p.visibility >= 0.35)));
    if (!visOk) return;

    const legAngleRaw = this.calculateAngle(hip, knee, ankle);
    const hipAngleRaw = this.calculateAngle(shoulder, hip, knee);

    // Use side-specific smoothing keys to prevent data mixing between legs
    // Reduced smoothing (0.3) for faster response to quick kicks
    const legAngle = this.smooth(`kick.leg.${side}`, legAngleRaw, 0.3);
    const hipAngle = this.smooth(`kick.hip.${side}`, hipAngleRaw, 0.3);
    
    let newStage;
    
    // Determine stage based on leg angle
    // Standing: leg straight (>145°)
    // Chambered: leg bent for kick preparation (45-95°)
    // Extending: transitioning from chamber to full extension (95-115°)
    // Extended: full kick with leg extended (≥115°)
    if (legAngle > 145) {
      newStage = 'standing';
    } else if (legAngle >= 45 && legAngle <= 95) {
      newStage = 'chambered';
    } else if (legAngle > 95 && legAngle < 115) {
      newStage = 'extending';
    } else {
      newStage = 'extended';
    }

    // Check if state is stable
    if (!this.updateStability('frontKick', newStage)) return;

    const state = this.frameCounts.frontKick;

    // Rep counting: chamber → extended → chamber = 1 rep
    // Standing state: user at rest or ready position
    // Chambered state: leg pulled up, preparing for kick
    // Extended state: full kick executed
    // Count rep when returning to chambered from extended
    
    if (this.repState.frontKick === 'standing') {
      // From standing, enter chambered state when leg is bent (45-95°)
      if (legAngle >= 45 && legAngle <= 95) {
        this.repStable.frontKick += 1;
        if (this.repStable.frontKick >= this.getRequiredStableFrames('frontKick')) {
          this.repState.frontKick = 'chambered';
          this.repStable.frontKick = 0;
        }
      } else {
        this.repStable.frontKick = 0;
      }
    } else if (this.repState.frontKick === 'chambered') {
      // From chambered, enter extended state when leg extends (≥115°)
      if (legAngle >= 115) {
        // FORM CHECK: Ensure proper extension - leg angle should be at least 100°
        // If less than 100°, it's not a proper kick
        if (legAngle < 100) {
          // Not a proper kick - don't progress to extended state
          this.repStable.frontKick = 0;
          if (this.canGiveFeedback('form')) {
            this.addFeedback('Extend your leg fully for a proper kick! 🦵', 'error');
            if (this.sound) this.sound.play('front-kick.form', 'frontKick', { formError: true });
            this.markFeedbackGiven('form');
          }
        } else {
          this.repStable.frontKick += 1;
          if (this.repStable.frontKick >= this.getRequiredStableFrames('frontKick')) {
            this.repState.frontKick = 'extended';
            this.repStable.frontKick = 0;
          }
        }
      } else {
        this.repStable.frontKick = 0;
      }
    } else if (this.repState.frontKick === 'extended') {
      // From extended, return to chambered OR standing to complete rep
      // Chambered: 45-95° OR Standing: >145°
      if ((legAngle >= 45 && legAngle <= 95) || legAngle > 145) {
        this.repStable.frontKick += 1;
        if (this.repStable.frontKick >= this.getRequiredStableFrames('frontKick')) {
          // Check cooldown to prevent double-counting
          const now = Date.now();
          const timeSinceLastRep = now - (this.lastRepTime.frontKick || 0);
          
          // Require at least 300ms between reps to prevent double-counting
          if (timeSinceLastRep >= 300) {
            state.count++;
            this.addFeedback(`Kick ${state.count} complete! 🥋`, 'success');
            if (this.sound) this.sound.markRep('frontKick', state.count);
            this.markFeedbackGiven('rep');
            this.lastRepTime.frontKick = now;
            
            // Determine next state based on where leg returned to
            if (legAngle > 145) {
              this.repState.frontKick = 'standing';
            } else {
              this.repState.frontKick = 'chambered';
            }
            this.repStable.frontKick = 0;
            // Reset midway flag when rep completes
            this.midwayFlags.frontKick = false;
            // Play encouragement every 5 reps
            if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
              this.addFeedback('Keep it up! 💪', 'info');
              this.markFeedbackGiven('encourage');
            }
          } else {
            // Too soon after last rep, likely a false trigger - reset to standing
            this.repState.frontKick = 'standing';
            this.repStable.frontKick = 0;
          }
        }
      } else {
        this.repStable.frontKick = 0;
      }
    }
    
    // FORM CHECKS during extended/extending phase
    if (newStage === 'extended' || newStage === 'extending') {
      // Check 1: Hip angle too narrow (leg raised too high) - causes lower back strain
      // Hip angle < 70° means leg is way too high
      if (hipAngle < 90) {
        const hipErrorStable = this.isFormErrorStable('frontKick.hipTooNarrow', true);
        if (hipErrorStable && this.canGiveFeedback('form')) {
          this.addFeedback('Don\'t raise your leg too high, protect your lower back! ⚠️', 'error');
          // No sound for this - the audio says "raise kick higher" which would be contradictory
          this.markFeedbackGiven('form');
        }
      } else {
        this.isFormErrorStable('frontKick.hipTooNarrow', false);
      }
      
      // Check 2: Leg not extending enough during kick (knee bent, leg angle < 100°)
      if (legAngle < 100 && this.repState.frontKick === 'extended') {
        const legBentStable = this.isFormErrorStable('frontKick.legNotExtended', true);
        if (legBentStable && this.canGiveFeedback('form')) {
          this.addFeedback('Extend your leg fully for a proper kick! 🦵', 'error');
          if (this.sound) this.sound.play('front-kick.form', 'frontKick', { formError: true });
          this.markFeedbackGiven('form');
        }
      } else {
        this.isFormErrorStable('frontKick.legNotExtended', false);
        if (this.sound) this.sound.clearFormError('front-kick.form', 'frontKick');
      }
    } else {
      // Clear form errors when not in kicking phase
      this.isFormErrorStable('frontKick.hipTooNarrow', false);
      this.isFormErrorStable('frontKick.legNotExtended', false);
      if (this.sound) this.sound.clearFormError('front-kick.form', 'frontKick');
    }
    
    // send progressive feedback during kick (ONCE per rep at midway point)
    if ((newStage === 'extending' || newStage === 'extended') && !this.midwayFlags.frontKick && this.canGiveFeedback('encourage')) {
      this.addFeedback('Push through! 🥋', 'info');
      if (this.sound) this.sound.midwayMaybePlay('frontKick');
      this.markFeedbackGiven('encourage');
      this.midwayFlags.frontKick = true; // Set flag to prevent repeated midway sounds
    }

    // removed incorrect low-kick penalty; height varies by context
  }


// overhead press 
detectOverheadPress(landmarks) {
  // Get both arms' landmarks
  const leftShoulder = landmarks[11];
  const leftElbow = landmarks[13];
  const leftWrist = landmarks[15];
  const leftHip = landmarks[23];
  
  const rightShoulder = landmarks[12];
  const rightElbow = landmarks[14];
  const rightWrist = landmarks[16];
  const rightHip = landmarks[24];

  // Require all core landmarks for both arms
  if (!leftShoulder || !leftElbow || !leftWrist || !leftHip ||
      !rightShoulder || !rightElbow || !rightWrist || !rightHip) return;

  // Check visibility for both arms
  const visCore = [leftShoulder, leftElbow, leftWrist, leftHip,
                    rightShoulder, rightElbow, rightWrist, rightHip].every(
    p => p && (p.visibility == null || p.visibility >= 0.5)
  );
  if (!visCore) return;

  // Calculate angles for LEFT arm
  const leftElbowAngleRaw = this.calculateAngle(leftWrist, leftElbow, leftShoulder);
  const leftShoulderAngleRaw = this.calculateAngle(leftElbow, leftShoulder, leftHip);
  
  // Calculate angles for RIGHT arm
  const rightElbowAngleRaw = this.calculateAngle(rightWrist, rightElbow, rightShoulder);
  const rightShoulderAngleRaw = this.calculateAngle(rightElbow, rightShoulder, rightHip);

  // Smooth angles for both arms
  const leftElbowAngle = this.smooth('press.leftElbow', leftElbowAngleRaw, 0.4);
  const leftShoulderAngle = this.smooth('press.leftShoulder', leftShoulderAngleRaw, 0.4);
  const rightElbowAngle = this.smooth('press.rightElbow', rightElbowAngleRaw, 0.4);
  const rightShoulderAngle = this.smooth('press.rightShoulder', rightShoulderAngleRaw, 0.4);

  // STATE DETECTION (BILATERAL) 
  // Both arms must meet criteria for each state
  let newStage = 'transition'; // Default fallback

  // 1. GROUND: Hands down, no errors
  const leftIsGround = leftShoulderAngle < 50;
  const rightIsGround = rightShoulderAngle < 50;
  
  // 2. RACK: 90-90 starting position (widened thresholds to tolerate natural asymmetry)
  const leftIsRack = (leftElbowAngle >= 60 && leftElbowAngle <= 125) &&
                     (leftShoulderAngle >= 60 && leftShoulderAngle <= 125);
  const rightIsRack = (rightElbowAngle >= 60 && rightElbowAngle <= 125) &&
                      (rightShoulderAngle >= 60 && rightShoulderAngle <= 125);
  
  // 3. LOCKOUT: Arms fully extended overhead
  const leftIsLockout = leftElbowAngle > 165 && leftShoulderAngle > 165;
  const rightIsLockout = rightElbowAngle > 165 && rightShoulderAngle > 165;

  // Determine stage - both arms must be in same state
  if (leftIsGround && rightIsGround) {
    newStage = 'ground';
  } else if (leftIsRack && rightIsRack) {
    newStage = 'rack';
  } else if (leftIsLockout && rightIsLockout) {
    newStage = 'lockout';
  } else {
    newStage = 'transition'; // Between states
  }

  // Check if state is stable
  if (!this.updateStability('overheadPress', newStage)) return;

  const state = this.frameCounts.overheadPress;

  // REP COUNTING
  // State machine: rack → lockout → rack = 1 rep
  if (this.repState.overheadPress === 'ground' || this.repState.overheadPress === 'start') {
    // User moves to rack position - ready to start rep
    if (newStage === 'rack') {
      this.repState.overheadPress = 'rack';
    }
  } else if (this.repState.overheadPress === 'rack') {
    // User presses to lockout
    if (newStage === 'lockout') {
      this.repState.overheadPress = 'lockout';
      // Progressive feedback at lockout
      if (!this.midwayFlags.overheadPress && this.canGiveFeedback('encourage')) {
        this.addFeedback('Good lockout! 🔥', 'info');
        if (this.sound) this.sound.midwayMaybePlay('overheadPress');
        this.markFeedbackGiven('encourage');
        this.midwayFlags.overheadPress = true;
      }
    }
  } else if (this.repState.overheadPress === 'lockout') {
    // User returns to rack - REP COMPLETE
    if (newStage === 'rack') {
      state.count++;
      this.addFeedback(`Rep ${state.count} complete! 🏋️`, 'success');
      if (this.sound) this.sound.markRep('overheadPress', state.count);
      this.markFeedbackGiven('rep');
      this.repState.overheadPress = 'rack';
      this.midwayFlags.overheadPress = false;
      
      // Play encouragement every 5 reps
      if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
        this.addFeedback('Keep it up! 💪', 'info');
        this.markFeedbackGiven('encourage');
      }
    } else if (newStage === 'ground') {
      // User rested arms - reset to ground
      this.repState.overheadPress = 'ground';
      this.midwayFlags.overheadPress = false;
    }
  }

  // Only check form errors when in transition state (not at ground or lockout)
  // This ensures no errors at ground phase (rule 1) and only checks when approaching rack
  if (newStage === 'transition') {
    // Only check if trying to reach rack position (shoulders elevated from ground)
    const isTryingRack = (leftShoulderAngle > 55 && leftShoulderAngle < 130) ||
                         (rightShoulderAngle > 55 && rightShoulderAngle < 130);
    
    if (isTryingRack) {
      // Check for narrow elbows - use average to prevent false positives from asymmetry
      const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
      const hasNarrowElbows = avgElbowAngle < 55;
      
      if (hasNarrowElbows && this.canGiveFeedback('form')) {
        this.addFeedback('Elbows are too narrow. 📐', 'error');
        if (this.sound) this.sound.play('overhead-press.form1', 'overheadPress', { formError: true });
        this.markFeedbackGiven('form');
      }
      
      // Check for wide elbows - use average to prevent false positives from asymmetry
      const hasWideElbows = avgElbowAngle > 130;
      
      if (hasWideElbows && this.canGiveFeedback('form')) {
        this.addFeedback('Elbows are too wide. 📐', 'error');
        if (this.sound) this.sound.play('overhead-press.form1', 'overheadPress', { formError: true });
        this.markFeedbackGiven('form');
      }
      
      // Clear form errors when angles are correct
      if (!hasNarrowElbows && !hasWideElbows) {
        if (this.sound) {
          this.sound.clearFormError('overhead-press.form1', 'overheadPress');
        }
      }
    } else {
      // Clear errors if not trying to reach rack
      if (this.sound) {
        this.sound.clearFormError('overhead-press.form1', 'overheadPress');
      }
    }
  } else {
    // Clear form errors when at ground, rack, or lockout positions
    if (this.sound) {
      this.sound.clearFormError('overhead-press.form1', 'overheadPress');
    }
  }
}

  // detect lateral raise
  detectLateralRaise(landmarks) {
    // Get both arms' landmarks
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const leftHip = landmarks[23];
    
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];
    const rightHip = landmarks[24];

    // Require all core landmarks for both arms
    if (!leftShoulder || !leftElbow || !leftWrist || !leftHip ||
        !rightShoulder || !rightElbow || !rightWrist || !rightHip) return;

    // Check visibility for both arms
    const visCore = [leftShoulder, leftElbow, leftWrist, leftHip,
                      rightShoulder, rightElbow, rightWrist, rightHip].every(
      p => p && (p.visibility == null || p.visibility >= 0.5)
    );
    if (!visCore) return;

    // Calculate angles for LEFT arm
    const leftShoulderAngleRaw = this.calculateAngle(leftHip, leftShoulder, leftWrist);  // Shoulder abduction
    const leftElbowAngleRaw = this.calculateAngle(leftShoulder, leftElbow, leftWrist);  // Elbow flexion
    
    // Calculate angles for RIGHT arm
    const rightShoulderAngleRaw = this.calculateAngle(rightHip, rightShoulder, rightWrist);  // Shoulder abduction
    const rightElbowAngleRaw = this.calculateAngle(rightShoulder, rightElbow, rightWrist);  // Elbow flexion

    // Smooth angles for both arms
    const leftShoulderAngle = this.smooth('lateralRaise.leftShoulder', leftShoulderAngleRaw, 0.4);
    const leftElbowAngle = this.smooth('lateralRaise.leftElbow', leftElbowAngleRaw, 0.4);
    const rightShoulderAngle = this.smooth('lateralRaise.rightShoulder', rightShoulderAngleRaw, 0.4);
    const rightElbowAngle = this.smooth('lateralRaise.rightElbow', rightElbowAngleRaw, 0.4);

    // Use average shoulder angle to determine stage (more robust than single side)
    const avgShoulderAngle = (leftShoulderAngle + rightShoulderAngle) / 2;
    
    let newStage;
    
    // determine stage from shoulder angle
    if (avgShoulderAngle < 30) {
      newStage = 'down';         // Arms at sides
    } else if (avgShoulderAngle < 60) {
      newStage = 'raising';      // Raising arms
    } else if (avgShoulderAngle < 75) {
      newStage = 'mid-range';    // Mid-way up
    } else {
      newStage = 'raised';       // Arms parallel to ground
    }

    // Check if state is stable
    if (!this.updateStability('lateralRaise', newStage)) return;

    const state = this.frameCounts.lateralRaise;

    // count reps when reaching raised position and returning to down
    if (this.repState.lateralRaise === 'down') {
      // mark raised when arms reach parallel position
      if (newStage === 'raised') {
        this.repState.lateralRaise = 'raised';
      }
    } else if (this.repState.lateralRaise === 'raised') {
      // count rep when returning to down
      if (newStage === 'down') {
        state.count++;
        if (this.sound) this.sound.markRep('lateralRaise', state.count);
        this.addFeedback(`Rep ${state.count} complete! 🏋️`, 'success');
        this.markFeedbackGiven('rep');
        this.repState.lateralRaise = 'down';
        // Reset midway flag when rep completes and user returns to start
        this.midwayFlags.lateralRaise = false;
        // Play encouragement every 5 reps
        if (state.count % 5 === 0 && this.canGiveFeedback('encourage')) {
          this.addFeedback('Keep it up! 💪', 'info');
          this.markFeedbackGiven('encourage');
        }
      }
    }
    
    // send progressive feedback during raise (ONCE per rep at midway point)
    if ((newStage === 'mid-range' || newStage === 'raised') && !this.midwayFlags.lateralRaise && this.canGiveFeedback('encourage')) {
      this.addFeedback('Almost there! 🔥', 'info');
      if (this.sound) this.sound.midwayMaybePlay('lateralRaise');
      this.markFeedbackGiven('encourage');
      this.midwayFlags.lateralRaise = true; // Set flag to prevent repeated midway sounds
    }

    // form corrections: check for bent elbows and arms raised too high
    // Use average elbow angle to prevent false positives from natural asymmetry
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
    
    // Form checks only in raised position with sufficient shoulder elevation
    if (newStage === 'raised' && avgShoulderAngle >= 70) {
      // Check 1: Arms raised too high (above shoulder level)
      // Target range is 80-95° (shoulder level), allow up to 110° for natural variation
      const raisedTooHigh = avgShoulderAngle > 125;
      const tooHighStable = this.isFormErrorStable('lateralRaise.tooHigh', raisedTooHigh);
      if (tooHighStable && this.canGiveFeedback('form')) {
        this.addFeedback('Don\'t raise arms above shoulder level! 📐', 'error');
        if (this.sound) this.sound.play('lateral-raise.form1', 'lateralRaise', { formError: true });
        this.markFeedbackGiven('form');
      } else if (!raisedTooHigh) {
        if (this.sound) this.sound.clearFormError('lateral-raise.form1', 'lateralRaise');
      }

      // Check 2: Bent elbows (more lenient threshold and higher stability)
      const hasBentElbows = avgElbowAngle < 140;
      const bentElbowsStable = this.isFormErrorStable('lateralRaise.bentElbows', hasBentElbows);
      // Require 8 consecutive frames instead of 5 to reduce noise
      if (bentElbowsStable && this.formErrorFrames['lateralRaise.bentElbows'] >= 8 && this.canGiveFeedback('form')) {
        this.addFeedback('Keep your elbows straight! 📐', 'error');
        if (this.sound) this.sound.play('lateral-raise.form2', 'lateralRaise', { formError: true });
        this.markFeedbackGiven('form');
      } else if (!hasBentElbows) {
        if (this.sound) this.sound.clearFormError('lateral-raise.form2', 'lateralRaise');
      }
    } else {
      // Clear all form errors when not in checked range
      if (this.sound) {
        this.sound.clearFormError('lateral-raise.form1', 'lateralRaise');
        this.sound.clearFormError('lateral-raise.form2', 'lateralRaise');
      }
      // Reset error counters when not checking
      this.formErrorFrames['lateralRaise.tooHigh'] = 0;
      this.formErrorFrames['lateralRaise.bentElbows'] = 0;
    }
  }

}
