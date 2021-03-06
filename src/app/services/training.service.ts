import {Injectable} from '@angular/core';
import {Exercise} from "../models/exercise.model";
import {Subject, Subscription} from "rxjs";
import {AngularFirestore} from "@angular/fire/firestore";
import {UiService} from "./ui.service";

@Injectable({
  providedIn: 'root'
})
export class TrainingService {

  exerciseChanged = new Subject<Exercise>()
  typesOfExercisesChanged = new Subject<Exercise[]>()
  exercisesChanged = new Subject<Exercise[]>()
  private typesOfExercises: Exercise[] = [];
  private runningExercise: Exercise;
  private afSubs: Subscription[] = []

  constructor(private db: AngularFirestore, private uiService: UiService) {
  }

  startExercise(selectedId: string) {
    this.runningExercise = this.typesOfExercises.find(ex => ex.id === selectedId)
    this.exerciseChanged.next({...this.runningExercise})
  }

  completeExercise() {
    this.addDataToDatabase({
      ...this.runningExercise,
      date: new Date(),
      state: "completed"
    })
    this.runningExercise = null
    this.exerciseChanged.next(null)

  }

  cancelExercise(progress: number) {
    this.addDataToDatabase({
      ...this.runningExercise,
      duration: this.runningExercise.duration * (progress / 100),
      calories: this.runningExercise.calories * (progress / 100),
      date: new Date(),
      state: "cancelled"
    })
    this.runningExercise = null
    this.exerciseChanged.next(null)
  }

  fetchTypesOfExercises() {
    this.uiService.loadingStateChanged.next(true)
    this.afSubs.push(this.db.collection('typesExercises').snapshotChanges()
      .map(docArray => {
        // throw(new Error())
        return docArray.map(doc => {
          return {
            id: doc.payload.doc.id,
            ...doc.payload.doc.data()
          }
        })
      }).subscribe((exercises: Exercise[]) => {
        this.uiService.loadingStateChanged.next(false)
        this.typesOfExercises = exercises;
        this.typesOfExercisesChanged.next([...this.typesOfExercises])
      }, error => {
        this.uiService.loadingStateChanged.next(false)
        this.uiService.showSnackbar('Fetching types of exercises failed. Please try again later.', null, 3000)
        this.typesOfExercisesChanged.next(null)
      }))
  }

  getRunningExercise() {
    return {...this.runningExercise}
  }

  fetchExercises() {
    this.afSubs.push(this.db.collection('finishedExercises').valueChanges()
      .subscribe((exercises: Exercise[]) => {
        this.exercisesChanged.next(exercises)
      }))
    // return this.exercises.slice()
  }

  cancelSubscriptions() {
    this.afSubs.forEach(sub => sub.unsubscribe())
  }

  private addDataToDatabase(exercise: Exercise) {
    this.db.collection('finishedExercises').add(exercise)
      .then(res => {
        console.log("Success! ", res)
      })
  }

}
