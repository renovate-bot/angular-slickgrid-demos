import { Component, OnInit, Input } from '@angular/core';
import { SwtCommonGridComponent } from './swt-common-grid.component';
import { Logger } from './swt-logger.service';
import { HttpClient } from '@angular/common/http';
import { GridOption } from 'angular-slickgrid';
/**
 * Custom pagination component: It allows editing the page number manually
 *  << < Page [1] of 5 > >>
 *
 * @author Saber Chebka, saber.chebka@gmail.com
 */
@Component({
  selector: 'swt-common-grid-pagination',
  template: `
    <div class="slick-pagination">
      <div class="slick-pagination-nav">
        <nav aria-label="Page navigation">
          <ul class="pagination">
            <li class="page-item" [ngClass]="pageNumber === 1 ? 'disabled' : ''">
              <a class="page-link icon-seek-first mdi mdi-page-first" aria-label="First" (click)="changeToFirstPage($event)"> </a>
            </li>
            <li class="page-item" [ngClass]="pageNumber === 1 ? 'disabled' : ''">
              <a
                class="page-link icon-seek-prev mdi mdi-chevron-down mdi-rotate-240"
                aria-label="Previous"
                (click)="changeToPreviousPage($event)"
              >
              </a>
            </li>
          </ul>
        </nav>

        <div class="slick-page-number">
          <span [translate]="'PAGE'"></span>
          <input type="text" value="{{ pageNumber }}" size="1" (change)="changeToCurrentPage($event)" />
          <span [translate]="'OF'"></span><span> {{ pageCount }}</span>
        </div>

        <nav aria-label="Page navigation">
          <ul class="pagination">
            <li class="page-item" [ngClass]="pageNumber === pageCount ? 'disabled' : ''">
              <a
                class="page-link icon-seek-next text-center mdi-chevron-down mdi-rotate-90"
                aria-label="Next"
                (click)="changeToNextPage($event)"
              >
              </a>
            </li>
            <li class="page-item" [ngClass]="pageNumber === pageCount ? 'disabled' : ''">
              <a class="page-link icon-seek-end mdi mdi-page-last" aria-label="Last" (click)="changeToLastPage($event)"> </a>
            </li>
          </ul>
        </nav>
        <nav>
          <ul class="pagination">
            <li class="">
              <span [hidden]="!processing" class="page-spin">
                <i class="mdi mdi-sync mdi-spin-1s"></i>
              </span>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  `,
  styles: [
    `
      .page-spin {
        border: none;
        height: 32px;
        background-color: transparent;
        cursor: default;
        animation: mdi-sync mdi-spin infinite linear !important;
      }
      .page-spin:hover {
        background-color: transparent;
      }
    `,
  ],
  standalone: false,
})
export class SwtCommonGridPaginationComponent implements OnInit {
  private logger: Logger;

  @Input() pageCount = 1;
  @Input() pageNumber = 1;

  totalItems = 0;
  processing = false;

  // Reference to the real pagination component
  realPagination = true;
  _gridPaginationOptions!: GridOption;
  commonGrid!: SwtCommonGridComponent;

  @Input()
  set gridPaginationOptions(gridPaginationOptions: GridOption) {
    this._gridPaginationOptions = gridPaginationOptions;

    // The backendServiceApi is itself the SwtCommonGridComponent (This is a hack)
    this.commonGrid = this.gridPaginationOptions!.backendServiceApi!.service as SwtCommonGridComponent;
  }
  get gridPaginationOptions(): GridOption {
    return this._gridPaginationOptions;
  }

  constructor(private httpClient: HttpClient) {
    this.logger = new Logger('grid-pagination', httpClient);
    this.logger.info('method [constructor] - START/END');
  }

  ngOnInit() {
    this.logger.info('init: ');
  }

  changeToFirstPage(event: any) {
    this.logger.info('method [changeToFirstPage] - START/END');
    this.pageNumber = 1;
    this.onPageChanged(event, this.pageNumber);
  }

  changeToLastPage(event: any) {
    this.logger.info('method [changeToLastPage] - START/END');
    this.pageNumber = this.pageCount;
    this.onPageChanged(event, this.pageNumber);
  }

  changeToNextPage(event: any) {
    this.logger.info('method [changeToNextPage] - START/END');
    if (this.pageNumber < this.pageCount) {
      this.pageNumber++;
      this.onPageChanged(event, this.pageNumber);
    }
  }

  changeToPreviousPage(event: any) {
    this.logger.info('method [changeToNextPage] - START/END');
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.onPageChanged(event, this.pageNumber);
    }
  }

  changeToCurrentPage(event: any) {
    this.logger.info('method [changeToCurrentPage] - START/END');
    this.pageNumber = event.currentTarget.value;
    if (this.pageNumber < 1) {
      this.pageNumber = 1;
    } else if (this.pageNumber > this.pageCount) {
      this.pageNumber = this.pageCount;
    }

    this.onPageChanged(event, this.pageNumber);
  }

  onPageChanged(event?: Event, pageNumber?: number) {
    this.logger.info('method [onPageChanged] - START/END', this.commonGrid);
    this.commonGrid.processOnPaginationChanged(event, { newPage: pageNumber as number, pageSize: -1 });
  }
}
