import {
  Component, EventEmitter, Inject,
  Input, Output, OnInit, ViewChild,
} from '@angular/core';
import { Observable }                       from 'rxjs/Observable';
import { APP_CONFIG }                       from '../../app.config';
import { Activity }                         from '../../shared/state/current-activity/current-activity.model';
import { Project }                          from '../../shared/state/project/project.model';
import { Projects }                         from '../../shared/state/project/projects.model';
import { ActivityService }                  from 'app/dashboard/shared/activity.service';
import { Store }                            from '@ngrx/store';
import { CurrentActivityActions }           from 'app/shared/state/current-activity/current-activity.actions';
import { AppState }                         from 'app/shared/state/appState';
import { ProjectsActions }                  from '../../shared/state/project/projects.actions';
import { ErrorService }                     from '../error/error.service';
import { User }                             from '../../shared/state/user/user.model';
import { UnSyncedActivityActions }          from '../../shared/state/unsynced-activities/unsynced-activities.actions';
import { StatusActions }                    from '../../shared/state/status/status.actions';

@Component({
  selector: 'toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.sass']
})

export class ToolbarComponent implements OnInit  {
  @Input() user: User;
  @Input() projects: Projects;
  @Input() currentActivity: Observable<Activity>;
  @Output() onMenuItemClicked = new EventEmitter();
  @ViewChild('taskNameInput') taskNameInput;
  currentActivityCopy: Activity;
  showTaskNameInput = false;
  private selectedProject: Project;
  private taskName: string;
  private timeDuration: string;
  private activityStarted = false;

  constructor (@Inject(APP_CONFIG) private config,
               private activityService: ActivityService,
               private store: Store<AppState>,
               private CurrentActivityActions: CurrentActivityActions,
               private UnsyncedActivityActions: UnSyncedActivityActions,
               private projectsActions: ProjectsActions,
               private errorService: ErrorService,
               private StatusActions: StatusActions) {
    this.selectedProject = new Project();
  }

  ngOnInit() {
    if (this.currentActivity) {
      this.currentActivity.subscribe(currentActivity => {
        this.currentActivityCopy = currentActivity;
        this.taskName = currentActivity.name;
        this.selectedProject = this.projects.entities[currentActivity.project];
        if (this.currentActivityCopy.startedAt) {
          this.activityStarted = true;
          let startedAt;
          let now;
          let duration;
          setInterval(() => {
            startedAt = Number(this.currentActivityCopy.startedAt);
            now = Date.now();
            duration = now - startedAt;
            this.timeDuration = this.getTime(duration);
          }, 1000);
        } else {
          this.activityStarted = false;
        }
      });
    }
  }

  getTime (duration) {
    let result: string;
    let x = duration / 1000;
    const seconds = Math.floor(x % 60);
    // minutes
    x /= 60;
    const minutes = Math.floor(x % 60);
    // hours
    x /= 60;
    const hours = Math.floor(x);

    let tempMinutes: string ;
    let tempSeconds: string ;
    let tempHours: string ;
    if (minutes < 10) {
      tempMinutes = '0' + minutes;
    } else {
      tempMinutes = '' + minutes;
    }
    if (seconds < 10) {
      tempSeconds = '0' + seconds;
    } else {
      tempSeconds = '' + seconds;
    }
    if (hours < 10) {
      tempHours = '0' + hours;
    } else {
      tempHours = '' + hours;
    }

    result = tempHours + ':' + tempMinutes + ':' + tempSeconds;



    if (minutes === 0 && hours === 0) {
      result = seconds + ' sec';
    }
    return result;
  };

  projectSelected(event) {
    console.log(event.index);
    this.selectedProject = event.selectedItem;
    console.log(event.selectedItem);
  }

  toggleStopStart() {
    if (this.activityStarted) {
      this.stopActivity();
    } else {
      this.startActivity();
    }
  }

  startActivity() {
    if (this.selectedProject) {
      this.activityStarted = true;
      if (!this.taskName) {
        this.taskName = 'Untiteld name';
      }
      const activity = new Activity();
      activity.project = this.selectedProject.id;
      activity.user = this.user.id;
      activity.name = this.taskName;
      activity.startedAt = Date.now().toString();
      this.activityService.create(this.selectedProject.id, activity).then((resActivity) => {
        this.showError('The activity was started');
        delete resActivity.createdAt;
        delete resActivity.updatedAt;
        this.store.dispatch(this.CurrentActivityActions.loadCurrentActivity(resActivity));
      })
        .catch(error => {
          this.showError('Server communication error');
          console.log('server error happened', error);
          this.store.dispatch(this.CurrentActivityActions.loadCurrentActivity(activity));
          this.store.dispatch(this.StatusActions.updateUnsyncedDataChanged(true));
        });
    } else {
      this.showError('Select a project');
    }
  }

  stopActivity() {
    if (this.currentActivity) {
      this.activityStarted = false;
      this.currentActivityCopy.stoppedAt = Date.now().toString();
      if (this.currentActivityCopy.id) {
        this.activityService.editCurrentActivity(this.currentActivityCopy.project, this.currentActivityCopy).then((activity) => {
          this.store.dispatch(this.CurrentActivityActions.clearCurrentActivity());
          this.store.dispatch(this.projectsActions.updateProjectActivities(activity.project, activity));
          this.taskName = null;
          this.showError('The activity was stopped');
        })
          .catch(error => {
            console.log('server error happened', error);
            this.showError('Server communication error');
            this.store.dispatch(this.UnsyncedActivityActions.addUnSyncedActivity(this.currentActivityCopy));
            this.store.dispatch(this.StatusActions.updateUnsyncedDataChanged(true));
            this.store.dispatch(this.projectsActions.updateProjectActivities(this.currentActivityCopy.project, this.currentActivityCopy));
            this.store.dispatch(this.CurrentActivityActions.clearCurrentActivity());
            this.taskName = null;
            this.showError('The activity was stopped');
          });
      } else {
        this.activityService.createManually(this.currentActivityCopy.project, this.currentActivityCopy).then((activity) => {
          this.store.dispatch(this.projectsActions.updateProjectActivities(activity.project, activity));
          this.store.dispatch(this.CurrentActivityActions.clearCurrentActivity());
          this.taskName = null;
          this.showError('The activity was stopped');
        })
          .catch(error => {
            console.log('server error happened', error);
            this.showError('Server communication error.');
            this.store.dispatch(this.UnsyncedActivityActions.addUnSyncedActivity(this.currentActivityCopy));
            this.store.dispatch(this.StatusActions.updateUnsyncedDataChanged(true));
            this.store.dispatch(this.projectsActions.updateProjectActivities(this.currentActivityCopy.project, this.currentActivityCopy));
            this.store.dispatch(this.CurrentActivityActions.clearCurrentActivity());
            this.taskName = null;
            this.showError('The activity was stopped');
          });
      }
    }
  }

  showSideMenu(event) {
    this.onMenuItemClicked.emit(event);
  }

  toggleShowTaskNameInput() {
    this.showTaskNameInput = !this.showTaskNameInput;
    if (this.showTaskNameInput) {
      // just for focus the input
      setTimeout(_ => {
        this.taskNameInput.nativeElement.focus();
      });
    }
  }

  nameActivity() {
    this.showTaskNameInput = false;

    if (this.currentActivity) {
      this.currentActivityCopy.name = this.taskName;
      if (this.currentActivityCopy.id) {
        this.activityService.editCurrentActivity(this.currentActivityCopy.project, this.currentActivityCopy).then((activity) => {
          delete activity.createdAt;
          delete activity.updatedAt;
          this.store.dispatch(this.CurrentActivityActions.loadCurrentActivity(activity));
        })
          .catch(error => {
            console.log('server error happened', error);
            this.store.dispatch(this.CurrentActivityActions.loadCurrentActivity(this.currentActivityCopy));
            this.store.dispatch(this.StatusActions.updateUnsyncedDataChanged(true));
          });
      } else {
        this.activityService.create(this.currentActivityCopy.project, this.currentActivityCopy).then((activity) => {
          delete activity.createdAt;
          delete activity.updatedAt;
          this.store.dispatch(this.CurrentActivityActions.loadCurrentActivity(activity));
        })
          .catch(error => {
            console.log('server error happened', error);
            this.store.dispatch(this.CurrentActivityActions.loadCurrentActivity(this.currentActivityCopy));
            this.store.dispatch(this.StatusActions.updateUnsyncedDataChanged(true));
          });
      }
    }
  }

  showError(error) {
    this.errorService.show({
      input: error
    });
  }
}
