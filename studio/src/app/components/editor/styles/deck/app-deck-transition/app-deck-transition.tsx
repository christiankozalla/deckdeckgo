import {Component, Element, Event, EventEmitter, Prop, h, State} from '@stencil/core';

import deckStore from '../../../../../stores/deck.store';

import {DeckAction} from '../../../../../types/editor/deck-action';

@Component({
  tag: 'app-deck-transition',
  styleUrl: 'app-deck-transition.scss',
})
export class AppDeckTransition {
  @Element() el: HTMLElement;

  @Prop()
  deckElement: HTMLDeckgoDeckElement;

  @Event() private transitionChange: EventEmitter<void>;

  @Event() deckNeedChange: EventEmitter<DeckAction>;

  @State()
  private selectedAnimation: 'slide' | 'fade' | 'none';

  @State()
  private selectedDirection: 'horizontal' | 'vertical' | 'papyrus';

  @State()
  private device: 'desktop' | 'mobile' = 'desktop';

  private timerIntervalDecks: NodeJS.Timeout;
  private timerCounterDecks: number = 0;

  private timerIntervalPapyrus: NodeJS.Timeout;
  private timerCounterPapyrus: number = 0;

  @State()
  private autoSlide: boolean = false;

  async componentWillLoad() {
    await this.initSelectedAnimation();
    await this.initSelectedDirection();
    await this.initDeckAutoSlide();
  }

  async componentDidLoad() {
    await this.animateDecks();
    await this.animatePapyrus();
  }

  disconnectedCallback() {
    if (this.timerIntervalDecks) {
      clearInterval(this.timerIntervalDecks);
    }

    if (this.timerIntervalPapyrus) {
      clearInterval(this.timerIntervalPapyrus);
    }
  }

  private async initSelectedAnimation() {
    if (!this.deckElement || !this.deckElement.hasAttribute('animation')) {
      this.selectedAnimation = 'slide';
      return;
    }

    this.selectedAnimation = this.deckElement.getAttribute('animation') as 'slide' | 'fade' | 'none';
  }

  private async initSelectedDirection() {
    const attribute: 'direction' | 'direction-mobile' = this.device === 'mobile' ? 'direction-mobile' : 'direction';

    if (!this.deckElement || !this.deckElement.hasAttribute(attribute)) {
      this.selectedDirection = this.device === 'mobile' ? 'papyrus' : 'horizontal';
      return;
    }

    this.selectedDirection = this.deckElement.getAttribute(attribute) as 'horizontal' | 'vertical' | 'papyrus';
  }

  private async initDeckAutoSlide() {
    this.autoSlide = deckStore.state.deck?.data?.attributes?.autoSlide !== undefined ? deckStore.state.deck.data.attributes.autoSlide : false;
  }

  private async animateDecks() {
    this.timerIntervalDecks = setInterval(async () => {
      const elements: NodeListOf<HTMLElement> = this.el.querySelectorAll('div.selected deckgo-deck:not(.papyrus)');

      if (elements) {
        for (const element of Array.from(elements)) {
          if (element.classList.contains('showcase-direction')) {
            await this.animateDecksDirection(element);
          } else {
            await this.animationDecksAnimation(element);
          }
        }
      }

      this.timerCounterDecks++;
    }, 1400);
  }

  private async animatePapyrus() {
    this.timerIntervalPapyrus = setInterval(async () => {
      const elements: NodeListOf<HTMLElement> = this.el.querySelectorAll('div.selected div.showcase-papyrus');

      if (elements) {
        for (const element of Array.from(elements)) {
          this.timerCounterPapyrus = this.timerCounterPapyrus > 19 ? 0 : this.timerCounterPapyrus + 1;

          element.scroll({top: element.offsetHeight * 4 * (this.timerCounterPapyrus / 20), behavior: 'smooth'});
        }
      }

      this.timerCounterPapyrus++;
    }, 500);
  }

  private async animateDecksDirection(element: HTMLElement) {
    const end: boolean = await (element as any).isEnd();

    if (end) {
      await (element as any).slideTo(0);
    } else {
      await (element as any).slideNext();
    }
  }

  private async animationDecksAnimation(element: HTMLElement) {
    if (this.timerCounterDecks % 2 === 0) {
      await (element as any).slideNext();
    } else {
      await (element as any).slidePrev();
    }
  }

  private async applyDirection(direction: 'horizontal' | 'vertical' | 'papyrus') {
    if (!this.deckElement || !direction) {
      return;
    }

    await this.goToFirstSlide();

    this.deckElement.setAttribute(this.device === 'mobile' ? 'direction-mobile' : 'direction', direction);

    this.selectedDirection = direction;

    this.transitionChange.emit();

    await this.deckElement.initSlideSize();
  }

  private async goToFirstSlide() {
    const begin: boolean = await (this.deckElement as HTMLDeckgoDeckElement).isBeginning();

    if (begin) {
      return;
    }

    await (this.deckElement as HTMLDeckgoDeckElement).slideTo(0);

    if (!this.deckElement.firstElementChild) {
      return;
    }

    this.deckElement.firstElementChild.scroll();
  }

  private async applyAnimation(animation: 'slide' | 'fade' | 'none') {
    if (!this.deckElement || !animation) {
      return;
    }

    this.deckElement.setAttribute('animation', animation);

    this.selectedAnimation = animation;

    this.transitionChange.emit();
  }

  private async selectDevice($event: CustomEvent) {
    if ($event && $event.detail) {
      this.device = $event.detail.value;

      await this.initSelectedDirection();
    }
  }

  private async onAutoSlideChange($event: CustomEvent) {
    this.autoSlide = $event && $event.detail ? $event.detail.value : true;

    this.deckNeedChange.emit({
      autoSlide: this.autoSlide,
    });
  }

  render() {
    return [this.renderDirection(), this.renderAnimation(), this.renderAutoSlide()];
  }

  private renderAutoSlide() {
    return (
      <app-expansion-panel expanded="close">
        <ion-label slot="title">Auto Slide</ion-label>

        <ion-list class="inputs-list">
          <ion-radio-group value={this.autoSlide} onIonChange={($event) => this.onAutoSlideChange($event)} class="inline ion-margin-start">
            <ion-item>
              <ion-radio value={true} mode="md"></ion-radio>
              <ion-label>Yes</ion-label>
            </ion-item>

            <ion-item>
              <ion-radio value={false} mode="md"></ion-radio>
              <ion-label>No</ion-label>
            </ion-item>
          </ion-radio-group>
        </ion-list>
      </app-expansion-panel>
    );
  }

  private renderDirection() {
    return (
      <app-expansion-panel>
        <ion-label slot="title">Direction</ion-label>

        {this.renderDirectionDevice()}

        <div class="container ion-margin-bottom">
          {this.renderDeckItem('direction', 'horizontal', 'horizontal', this.selectedAnimation, 'Horizontal', this.selectedDirection === 'horizontal', () =>
            this.applyDirection('horizontal')
          )}

          {this.renderDeckItem('direction', 'vertical', 'vertical', this.selectedAnimation, 'Vertical', this.selectedDirection === 'vertical', () =>
            this.applyDirection('vertical')
          )}

          {this.renderShowcasePapyrus('Papyrus', this.selectedDirection === 'papyrus', () => this.applyDirection('papyrus'))}
        </div>
      </app-expansion-panel>
    );
  }

  private renderDirectionDevice() {
    return (
      <div class="device">
        <ion-segment mode="ios" value={this.device} onIonChange={($event: CustomEvent) => this.selectDevice($event)}>
          <ion-segment-button value="desktop" mode="ios">
            <ion-label>Desktop</ion-label>
          </ion-segment-button>
          <ion-segment-button value="mobile" mode="ios">
            <ion-label>Mobile</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    );
  }

  private renderAnimation() {
    return (
      <app-expansion-panel expanded="close">
        <ion-label slot="title">Animation</ion-label>
        <div class="container ion-margin-bottom">
          {this.renderDeckItem('animation', 'horizontal', 'horizontal', 'slide', 'Swipe', this.selectedAnimation === 'slide', () =>
            this.applyAnimation('slide')
          )}

          {this.renderDeckItem('animation', 'horizontal', 'horizontal', 'fade', 'Fade', this.selectedAnimation === 'fade', () => this.applyAnimation('fade'))}

          {this.renderDeckItem('animation', 'horizontal', 'horizontal', 'none', 'Instant', this.selectedAnimation === 'none', () =>
            this.applyAnimation('none')
          )}
        </div>
      </app-expansion-panel>
    );
  }

  private renderDeckItem(
    showcase: 'animation' | 'direction',
    direction: 'horizontal' | 'vertical' | 'papyrus',
    directionMobile: 'horizontal' | 'vertical' | 'papyrus',
    animation: 'slide' | 'fade' | 'none',
    text: string,
    selected: boolean,
    action: (selection) => Promise<void>
  ) {
    return (
      <div class={`item ${selected ? 'selected' : ''} showcase-${showcase}`} custom-tappable onClick={action}>
        <deckgo-deck
          embedded={true}
          keyboard={false}
          animation={animation}
          direction={direction}
          directionMobile={directionMobile}
          class={`showcase-${showcase}`}>
          {this.renderItems(text, showcase === 'direction' ? 4 : 2, selected, showcase)}
        </deckgo-deck>
      </div>
    );
  }

  private renderShowcasePapyrus(text: string, selected: boolean, action: (selection) => Promise<void>) {
    return (
      <div class={`item ${selected ? 'selected' : ''} showcase-direction`} custom-tappable onClick={action}>
        <div class="showcase-papyrus">{this.renderItems(text, 4, selected, 'direction')}</div>
      </div>
    );
  }

  private renderItems(text: string, count: 2 | 4, selected: boolean, showcase: 'direction' | 'animation') {
    return [...new Array(count)].map((_empty, i: number) => {
      return (
        <deckgo-slide-title
          style={{
            '--background': `${
              !selected ? 'transparent' : i % 2 > 0 ? `var(--ion-color-${showcase === 'direction' ? 'primary' : 'tertiary'})` : 'transparent'
            }`,
            '--color': !selected ? 'inherit' : `${i % 2 > 0 ? `var(--ion-color-${showcase === 'direction' ? 'primary' : 'tertiary'}-contrast)` : 'inherit'}`,
          }}>
          <p slot="title">{text}</p>
        </deckgo-slide-title>
      );
    });
  }
}
