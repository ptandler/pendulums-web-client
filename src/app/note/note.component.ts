import { Component, Input, OnInit, OnDestroy, Output }                   from '@angular/core';
import { Store }                                      from '@ngrx/store';
import { AppState }                                   from '../shared/state/appState';
import { Observable }                                 from 'rxjs/Observable';
import { User }                                       from '../shared/state/user/user.model';
import { AppStateSelectors }                          from '../shared/state/app-state.selectors';
import { CreateEditNoteComponent }                    from './create-edit-note/create-edit-note.component';
import { ModalService }                               from '../core/modal/modal.service';
import { NoteService }                                from './shared/notes.service';
import { NotesActions }                               from '../shared/state/note/notes.actions';
import { Note }                                       from 'app/shared/state/note/note.model';
import { Location }                                   from '@angular/common';
import { Subscription }                               from 'rxjs/Subscription';
import * as _ from 'lodash';

@Component({
  selector: 'note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.sass']
})
export class NoteComponent implements OnInit, OnDestroy {
  @Input() user: Observable<User>;
  @Output() selectedTab: Boolean = false;
  @Output() projectsId: Object = {};
  notes: Observable<any>;
  sortBy: Observable<string>;
  projects: Observable<any>;
  archives: Array<any>;
  actives: Array<any>;
  sortOptions = [
    {name: 'Sort by date (ascending)', value: '+date'},
    {name: 'Sort by date (descending)', value: '-date'},
    {name: 'Sort by title (ascending)', value: '+title'},
    {name: 'Sort by title (descending)', value: '-title'},
  ]
  sortByItemIndex: number;
  private subscriptions: Array<Subscription> = [];

  constructor (private modalService: ModalService,
    appStateSelectors: AppStateSelectors,
    private noteService: NoteService,
    private location: Location,
    private store: Store<AppState>,
    private notesActions: NotesActions,
  ) {
    this.notes = store.select(appStateSelectors.getNotesArray);
    this.sortBy = store.select(appStateSelectors.getNotesSortBy);
    this.projects = store.select(appStateSelectors.getProjectsArray);
  }

  ngOnInit(): void {
    this.noteService.getNotes().then((notes) => {
      this.store.dispatch(this.notesActions.loadNotes(notes));
    })

    this.subscriptions.push(this.projects.subscribe((params: any) => {
      this.projectsId = params.reduce((obj, project) => ({...obj, [project.id]: project.name}), {})
    }));
    this.subscriptions.push(this.notes.subscribe((params: any) => {
      this.actives = _.filter(params, ['isArchive', false])
    }));
    this.subscriptions.push(this.sortBy.subscribe(sortBy =>
      this.sortByItemIndex = this.sortOptions.findIndex(sortOption => sortOption.value === sortBy)
    ));
  }

  goBack() {
    this.location.back();
  }

  openCreateNoteModal() {
    this.modalService.show({
      component: CreateEditNoteComponent,
      inputs: {
        note: new Note()
      },
    });
  }

  getSelectedTab(event) {
    if (event.name === 'Archive') {
      this.subscriptions.push(this.notes.subscribe((params: any) => {
        this.archives = _.filter(params, ['isArchive', true])
      }));
      this.selectedTab = true
    } else {
      this.selectedTab = false
    }
  }

  sort(event) {
    this.store.dispatch(this.notesActions.updateNotesSortBy(event.selectedItem.value));
  }

  ngOnDestroy() {
    this.subscriptions.map((subscribe) => {
      subscribe.unsubscribe()
    });
  }

}


