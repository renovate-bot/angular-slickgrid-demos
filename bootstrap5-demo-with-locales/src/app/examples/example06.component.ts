import { GraphqlService, GraphqlPaginatedResult, GraphqlServiceApi, GraphqlServiceOption, } from '@slickgrid-universal/graphql';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { addDay, format as tempoFormat } from '@formkit/tempo';
import {
  AngularGridInstance,
  Column,
  CursorPageInfo,
  Filters,
  Formatters,
  GridOption,
  GridStateChange,
  Metrics,
  type MultipleSelectOption,
  OperatorType,
} from 'angular-slickgrid';

const defaultPageSize = 20;
const GRAPHQL_QUERY_DATASET_NAME = 'users';
const LOCAL_STORAGE_KEY = 'gridStateGraphql';
const FAKE_SERVER_DELAY = 250;

@Component({
  templateUrl: './example06.component.html',
  standalone: false,
})
export class Example6Component implements OnInit {
  title = 'Example 6: Grid connected to Backend Server with GraphQL';
  subTitle = `
    Sorting/Paging connected to a Backend GraphQL Service (<a href="https://ghiscoding.gitbook.io/angular-slickgrid/backend-services/graphql" target="_blank">Wiki docs</a>).
    <br/>
    <ul class="small">
      <li><span class="red">(*) NO DATA SHOWING</span> - just change Filters &amp; Pages and look at the "GraphQL Query" changing :)</li>
      <li>This example also demos the Grid State feature, open the console log to see the changes</li>
      <li>String column also support operator (>, >=, <, <=, <>, !=, =, ==, *)</li>
      <ul>
        <li>The (*) can be used as startsWith (ex.: "abc*" => startsWith "abc") / endsWith (ex.: "*xyz" => endsWith "xyz")</li>
        <li>The other operators can be used on column type number for example: ">=100" (bigger or equal than 100)</li>
      </ul>
      <li>You can also preload a grid with certain "presets" like Filters / Sorters / Pagination <a href="https://ghiscoding.gitbook.io/angular-slickgrid/grid-functionalities/grid-state-and-preset" target="_blank">Wiki - Grid Preset</a></li>
      <li>Also note that the column Name has a filter with a custom %% operator that behaves like an SQL LIKE operator supporting % wildcards.</li>
      <li>Depending on your configuration, your GraphQL Server might already support regex querying (e.g. Hasura <a href="https://hasura.io/docs/latest/queries/postgres/filters/text-search-operators/#_regex" target="_blank">_regex</a>)
      or you could add your own implementation (e.g. see this SO <a href="https://stackoverflow.com/a/37981802/1212166">Question</a>).</li>
    </ul>
  `;
  angularGrid!: AngularGridInstance;
  columnDefinitions!: Column[];
  gridOptions!: GridOption;
  dataset = [];
  metrics!: Metrics;

  isWithCursor = false;
  graphqlQuery = '';
  processing = true;
  status = { text: 'processing...', class: 'alert alert-danger' };
  serverWaitDelay = FAKE_SERVER_DELAY; // server simulation with default of 250ms but 50ms for Cypress tests

  constructor(private readonly cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.columnDefinitions = [
      {
        id: 'name', field: 'name', name: 'Name', width: 60, columnGroup: 'Customer Information',
        sortable: true,
        filterable: true,
        filter: {
          model: Filters.compoundInput,
          compoundOperatorList: [
            { operator: '', desc: 'Contains' },
            { operator: '<>', desc: 'Not Contains' },
            { operator: '=', desc: 'Equals' },
            { operator: '!=', desc: 'Not equal to' },
            { operator: 'a*', desc: 'Starts With' },
            { operator: 'Custom', desc: 'SQL Like' },
          ],
        }
      },
      {
        id: 'gender', field: 'gender', name: 'Gender', filterable: true, sortable: true, width: 60, columnGroup: 'Customer Information',
        filter: {
          model: Filters.singleSelect,
          collection: [{ value: '', label: '' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]
        }
      },
      {
        id: 'company', field: 'company', name: 'Company', width: 60, columnGroup: 'Customer Information',
        sortable: true, filterable: true,
        filter: {
          model: Filters.multipleSelect,
          collection: [{ value: 'acme', label: 'Acme' }, { value: 'abc', label: 'Company ABC' }, { value: 'xyz', label: 'Company XYZ' }],
          options: {
            filter: true // adds a filter on top of the multi-select dropdown
          } as MultipleSelectOption
        }
      },
      {
        id: 'billingAddressStreet', field: 'billing.address.street', name: 'Address Street',
        width: 60, filterable: true, sortable: true, columnGroup: 'Billing Information',
      },
      {
        id: 'billingAddressZip', field: 'billing.address.zip', name: 'Address Zip', width: 60,
        type: 'number',
        columnGroup: 'Billing Information',
        filterable: true, sortable: true,
        filter: {
          model: Filters.compoundInput
        },
        formatter: Formatters.complexObject
      },
      {
        id: 'finish', field: 'finish', name: 'Date', formatter: Formatters.dateIso, sortable: true, minWidth: 90, width: 120, exportWithFormatter: true,
        type: 'date',
        columnGroup: 'Billing Information',
        filterable: true,
        filter: {
          model: Filters.dateRange,
          filterShortcuts: [
            {
              title: 'Next 20 days',
              iconCssClass: 'mdi mdi-calendar',
              searchTerms: [tempoFormat(new Date(), 'YYYY-MM-DD'), tempoFormat(addDay(new Date(), 20), 'YYYY-MM-DD')],
            },
          ]
        }
      },
    ];

    const currentYear = new Date().getFullYear();
    const presetLowestDay = `${currentYear}-01-01`;
    const presetHighestDay = `${currentYear}-02-15`;

    this.gridOptions = {
      gridHeight: 200,
      gridWidth: 900,
      compoundOperatorAltTexts: {
        // where '=' is any of the `OperatorString` type shown above
        text: { 'Custom': { operatorAlt: '%%', descAlt: 'SQL Like' } },
      },
      enableFiltering: true,
      enableCellNavigation: true,
      createPreHeaderPanel: true,
      showPreHeaderPanel: true,
      preHeaderPanelHeight: 28,
      gridMenu: {
        resizeOnShowHeaderRow: true,
        commandItems: [
          {
            iconCssClass: 'mdi mdi-close text-danger',
            title: 'Reset Grid',
            disabled: false,
            command: 'reset-grid',
            positionOrder: 60
          }
        ],
        onCommand: (e, args) => {
          if (args.command === 'reset-grid') {
            this.angularGrid.gridService.resetGrid(this.columnDefinitions);
            localStorage[LOCAL_STORAGE_KEY] = null;
          }
        }
      },
      enablePagination: true, // you could optionally disable the Pagination
      pagination: {
        pageSizes: [10, 15, 20, 25, 30, 40, 50, 75, 100],
        pageSize: defaultPageSize,
        totalItems: 0
      },
      presets: {
        columns: [
          { columnId: 'name', width: 100 },
          { columnId: 'gender', width: 55 },
          { columnId: 'company' },
          { columnId: 'billingAddressZip' }, // flip column position of Street/Zip to Zip/Street
          { columnId: 'billingAddressStreet', width: 120 },
          { columnId: 'finish', width: 130 },
        ],
        filters: [
          // you can use OperatorType or type them as string, e.g.: operator: 'EQ'
          { columnId: 'gender', searchTerms: ['male'], operator: OperatorType.equal },
          // { columnId: 'name', searchTerms: ['John Doe'], operator: OperatorType.contains },
          { columnId: 'name', searchTerms: ['Joh*oe'], operator: OperatorType.startsWithEndsWith },
          { columnId: 'company', searchTerms: ['xyz'], operator: 'IN' },

          // use a date range with 2 searchTerms values
          { columnId: 'finish', searchTerms: [presetLowestDay, presetHighestDay], operator: OperatorType.rangeInclusive },
        ],
        sorters: [
          // direction can written as 'asc' (uppercase or lowercase) and/or use the SortDirection type
          { columnId: 'name', direction: 'asc' },
          { columnId: 'company', direction: 'DESC' }
        ],
        pagination: { pageNumber: this.isWithCursor ? 1 : 2, pageSize: 20 } // if cursor based, start at page 1
      },
      backendServiceApi: {
        service: new GraphqlService(),
        options: {
          datasetName: GRAPHQL_QUERY_DATASET_NAME, // the only REQUIRED property
          addLocaleIntoQuery: true,   // optionally add current locale into the query
          extraQueryArguments: [{     // optionally add some extra query arguments as input query arguments
            field: 'userId',
            value: 123
          }],
          filterQueryOverride: ({ fieldName, columnDef, columnFilterOperator, searchValues }) => {
            if (columnFilterOperator === OperatorType.custom && columnDef?.id === 'name') {
              // technically speaking GraphQL isn't a database query language like SQL, it's an application query language.
              // What that means is that GraphQL won't let you write arbitrary queries out of the box.
              // It will only support the types of queries defined in your GraphQL schema.
              // see this SO: https://stackoverflow.com/a/37981802/1212166
              return { field: fieldName, operator: 'Like', value: searchValues[0] };
            }
            return;
          },
          useCursor: this.isWithCursor, // sets pagination strategy, if true requires a call to setPageInfo() when graphql call returns
          // when dealing with complex objects, we want to keep our field name with double quotes
          // example with gender: query { users (orderBy:[{field:"gender",direction:ASC}]) {}
          keepArgumentFieldDoubleQuotes: true
        },
        // you can define the onInit callback OR enable the "executeProcessCommandOnInit" flag in the service init
        // onInit: (query) => this.getCustomerApiCall(query)
        preProcess: () => this.displaySpinner(true),
        process: (query) => this.getCustomerApiCall(query),
        postProcess: (result: GraphqlPaginatedResult) => {
          this.metrics = result.metrics as Metrics;
          this.displaySpinner(false);
          this.cd.detectChanges();
        }
      } as GraphqlServiceApi
    };
  }

  angularGridReady(angularGrid: AngularGridInstance) {
    this.angularGrid = angularGrid;
  }

  displaySpinner(isProcessing: boolean) {
    this.processing = isProcessing;
    this.status = (isProcessing)
      ? { text: 'processing...', class: 'alert alert-danger' }
      : { text: 'finished', class: 'alert alert-success' };
  }

  /**
   * Calling your GraphQL backend server should always return a Promise or Observable of type GraphqlPaginatedResult (or GraphqlResult without Pagination)
   * @param query
   * @return Promise<GraphqlPaginatedResult> | Observable<GraphqlResult>
   */
  getCustomerApiCall(_query: string): Promise<GraphqlPaginatedResult> {
    let pageInfo: CursorPageInfo;
    if (this.angularGrid?.paginationService) {
      const { paginationService } = this.angularGrid;
      // there seems to a timing issue where when you click "cursor" it requests the data before the pagination-service is initialized...
      const pageNumber = (paginationService as any)._initialized ? paginationService.getCurrentPageNumber() : 1;
      // In the real world, each node item would be A,B,C...AA,AB,AC, etc and so each page would actually be something like A-T, T-AN
      // but for this mock data it's easier to represent each page as
      // Page1: A-B
      // Page2: B-C
      // Page3: C-D
      // Page4: D-E
      // Page5: E-F
      const startCursor = String.fromCharCode('A'.charCodeAt(0) + pageNumber - 1);
      const endCursor = String.fromCharCode(startCursor.charCodeAt(0) + 1);
      pageInfo = {
        hasPreviousPage: paginationService.dataFrom === 0,
        hasNextPage: paginationService.dataTo === 100,
        startCursor,
        endCursor
      };
    } else {
      pageInfo = {
        hasPreviousPage: false,
        hasNextPage: true,
        startCursor: 'A',
        endCursor: 'B'
      };
    }

    // in your case, you will call your WebAPI function (wich needs to return a Promise)
    // for the demo purpose, we will call a mock WebAPI function
    const mockedResult = {
      // the dataset name is the only unknown property
      // will be the same defined in your GraphQL Service init, in our case GRAPHQL_QUERY_DATASET_NAME
      data: {
        [GRAPHQL_QUERY_DATASET_NAME]: {
          nodes: [],
          totalCount: 100,
          pageInfo
        }
      }
    };

    return new Promise(resolve => {
      setTimeout(() => {
        this.graphqlQuery = this.angularGrid.backendService!.buildQuery();
        if (this.isWithCursor) {
          // When using cursor pagination, the pagination service needs to be updated with the PageInfo data from the latest request
          // This might be done automatically if using a framework specific slickgrid library
          // Note because of this timeout, this may cause race conditions with rapid clicks!
          this.angularGrid?.paginationService?.setCursorPageInfo((mockedResult.data[GRAPHQL_QUERY_DATASET_NAME].pageInfo));
        }
        resolve(mockedResult);
      }, this.serverWaitDelay);
    });
  }

  goToFirstPage() {
    this.angularGrid.paginationService!.goToFirstPage();
  }

  goToLastPage() {
    this.angularGrid.paginationService!.goToLastPage();
  }

  /** Dispatched event of a Grid State Changed event */
  gridStateChanged(gridStateChanges: GridStateChange) {
    console.log('GraphQL Example, Grid State changed:: ', gridStateChanges);
    localStorage[LOCAL_STORAGE_KEY] = JSON.stringify(gridStateChanges.gridState);
  }

  clearAllFiltersAndSorts() {
    if (this.angularGrid?.gridService) {
      this.angularGrid.gridService.clearAllFiltersAndSorts();
    }
  }

  /** Save current Filters, Sorters in LocaleStorage or DB */
  saveCurrentGridState() {
    console.log('GraphQL current grid state', this.angularGrid.gridStateService.getCurrentGridState());
  }

  setFiltersDynamically() {
    const currentYear = new Date().getFullYear();
    const presetLowestDay = `${currentYear}-01-01`;
    const presetHighestDay = `${currentYear}-02-15`;

    // we can Set Filters Dynamically (or different filters) afterward through the FilterService
    this.angularGrid.filterService.updateFilters([
      { columnId: 'gender', searchTerms: ['female'], operator: OperatorType.equal },
      { columnId: 'name', searchTerms: ['Jane'], operator: OperatorType.startsWith },
      { columnId: 'company', searchTerms: ['acme'], operator: 'IN' },
      { columnId: 'billingAddressZip', searchTerms: ['11'], operator: OperatorType.greaterThanOrEqual },
      { columnId: 'finish', searchTerms: [presetLowestDay, presetHighestDay], operator: OperatorType.rangeInclusive },
    ]);
  }

  setSortingDynamically() {
    this.angularGrid.sortService.updateSorting([
      // orders matter, whichever is first in array will be the first sorted column
      { columnId: 'billingAddressZip', direction: 'DESC' },
      { columnId: 'company', direction: 'ASC' },
    ]);
  }

  resetToOriginalPresets() {
    const currentYear = new Date().getFullYear();
    const presetLowestDay = `${currentYear}-01-01`;
    const presetHighestDay = `${currentYear}-02-15`;

    this.angularGrid.filterService.updateFilters([
      // you can use OperatorType or type them as string, e.g.: operator: 'EQ'
      { columnId: 'gender', searchTerms: ['male'], operator: OperatorType.equal },
      // { columnId: 'name', searchTerms: ['John Doe'], operator: OperatorType.contains },
      { columnId: 'name', searchTerms: ['Joh*oe'], operator: OperatorType.startsWithEndsWith },
      { columnId: 'company', searchTerms: ['xyz'], operator: 'IN' },

      // use a date range with 2 searchTerms values
      { columnId: 'finish', searchTerms: [presetLowestDay, presetHighestDay], operator: OperatorType.rangeInclusive },
    ]);
    this.angularGrid.sortService.updateSorting([
      // direction can written as 'asc' (uppercase or lowercase) and/or use the SortDirection type
      { columnId: 'name', direction: 'asc' },
      { columnId: 'company', direction: 'DESC' }
    ]);
    setTimeout(() => {
      this.angularGrid.paginationService?.changeItemPerPage(20);
      this.angularGrid.paginationService?.goToPageNumber(2);
    });
  }

  setIsWithCursor(isWithCursor: boolean) {
    this.isWithCursor = isWithCursor;
    this.resetOptions({ useCursor: this.isWithCursor });
    return true;
  }

  private resetOptions(options: Partial<GraphqlServiceOption>) {
    this.displaySpinner(true);
    const graphqlService = this.gridOptions.backendServiceApi!.service as GraphqlService;
    this.angularGrid.paginationService!.setCursorBased(options.useCursor as boolean);
    graphqlService.updateOptions(options);
    this.gridOptions = { ...this.gridOptions };
    this.angularGrid.paginationService?.goToFirstPage();
  }
}
