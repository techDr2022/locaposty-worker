import { format, parse } from "date-fns";

export interface PerformanceDataItem {
  date: string;
  views: number;
  clicks: number;
  calls: number;
  directions: number;
  mobileMapViews?: number;
  mobileSearchViews?: number;
  desktopMapViews?: number;
  desktopSearchViews?: number;
  bookings?: number;
  foodOrders?: number;
  conversations?: number;
  foodMenuClicks?: number;
}

export interface ReviewDataForPdf {
  summary: {
    totalReviews: number;
    averageRating: number;
    replyRate: number;
    averageReplyResponseTime: number;
    ratingDistribution: {
      oneStar: number;
      twoStar: number;
      threeStar: number;
      fourStar: number;
      fiveStar: number;
    };
  };
}

export interface SearchKeywordForPdf {
  keyword: string;
  impressions: number;
}

// ─── Locaposty Logo (inline, PDF-safe) ──────────────────────────────────────
const LOCAPOSTY_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1150 261" width="120" height="29">
<path d="M0 0 C88.54643629 0 88.54643629 0 104.8671875 15.80859375 C115.35851282 26.99783985 118.68643478 41.34953101 118.28125 56.42578125 C117.14432879 70.87415496 113.16714267 85.07842324 102 95 C81.97376752 110.14642267 61.40013655 110 37 110 C37 129.47 37 148.94 37 169 C24.79 169 12.58 169 0 169 C0 113.23 0 57.46 0 0 Z M37 30 C37 46.17 37 62.34 37 79 C56.85267191 79.94837464 56.85267191 79.94837464 74 72 C78.82551062 67.17448938 81.07758643 60.77291821 81.375 54 C81.03500127 46.57915825 78.45609148 40.10025943 73 35 C61.69989732 28.37287211 50.13939887 30 37 30 Z" fill="#0255A3" transform="translate(504,23)"/>
<path d="M0 0 C12.87 0 25.74 0 39 0 C43.5023874 11.2559685 43.5023874 11.2559685 45.44189453 17.03515625 C45.6538446 17.66428925 45.86579468 18.29342224 46.08416748 18.94161987 C46.77015397 20.98088676 47.45178146 23.02157332 48.1328125 25.0625 C48.61546588 26.50401571 49.09820474 27.94550279 49.58102417 29.38696289 C50.58657317 32.3917115 51.58968616 35.39726067 52.59130859 38.40332031 C53.86721753 42.23125068 55.15137799 46.05635661 56.4376545 49.8808136 C57.43528682 52.85135075 58.4273851 55.82371499 59.41799545 58.79660034 C59.88886332 60.2068645 60.36164807 61.61649031 60.83649063 63.02542114 C63.19475552 70.02989017 65.4178064 76.93567688 66.63595581 84.24438477 C66.83655453 86.01949005 66.83655453 86.01949005 68 87 C68.23041992 86.02361572 68.46083984 85.04723145 68.69824219 84.04125977 C72.68444114 67.80808069 78.15227477 52.04405846 83.48339844 36.21685791 C84.51670947 33.14448525 85.54424147 30.07019369 86.57159805 26.99582577 C87.8008119 23.31811803 89.0329949 19.64140764 90.265625 15.96484375 C90.49898811 15.26815016 90.73235123 14.57145657 90.97278595 13.85365105 C91.62898528 11.89658987 92.28726771 9.94024327 92.94628906 7.98413086 C93.31981506 6.87339706 93.69334106 5.76266327 94.07818604 4.61827087 C95 2 95 2 96 0 C108.87 0 121.74 0 135 0 C129.07094374 17.25748363 122.68677236 34.3313153 116.25735855 51.40654373 C113.85050825 57.79889797 111.44594203 64.19211224 109.04150581 70.58537483 C108.43281538 72.20371039 107.82400357 73.82200031 107.21507072 75.44024467 C103.3027119 85.8385024 99.41770214 96.24629701 95.56987762 106.6686058 C93.92875404 111.11050634 92.28055242 115.54978944 90.6338501 119.98962402 C89.76447975 122.34036546 88.89877553 124.69246653 88.03704834 127.04602051 C80.1749971 148.51252826 72.42491809 169.66231579 51.1875 181.1875 C49.80458345 181.82067444 48.40773473 182.42410852 47 183 C46.27039062 183.30035156 45.54078125 183.60070312 44.7890625 183.91015625 C38.32850112 186.10104063 32.00590766 186.28213899 25.25 186.3125 C24.35063721 186.31797852 23.45127441 186.32345703 22.5246582 186.32910156 C17.03555777 186.27008445 13.54859577 185.58531308 8 184 C8 174.43 8 164.86 8 155 C10.64 155.33 13.28 155.66 16 156 C24.03936854 156.61568065 30.67183396 155.51637561 37.6875 151.4375 C42.91512939 145.92729605 47.29356917 138.45907803 49 131 C48.65172937 124.24315276 46.57244602 118.69557618 44.01855469 112.47583008 C43.60703659 111.45191162 43.19551849 110.42799316 42.77153015 109.37304688 C41.4139372 106.00151403 40.04296051 102.63559703 38.671875 99.26953125 C37.72034812 96.91349049 36.76969844 94.55709529 35.81988525 92.20036316 C33.57329388 86.63171681 31.31839575 81.06650864 29.05923867 75.50295419 C26.25699854 68.60080577 23.46604736 61.69410525 20.67578125 54.78710938 C17.81966272 47.71713955 14.9628843 40.64745949 12.09686279 33.58149719 C9.72203429 27.7246869 7.35475194 21.86491235 5 16 C4.70120438 15.25629025 4.40240875 14.51258049 4.09455872 13.74633408 C3.3511732 11.88774171 2.61697852 10.02547993 1.88378906 8.1628418 C1.50869202 7.21120651 1.13359497 6.25957123 0.74713135 5.27909851 C0 3 0 3 0 0 Z" fill="#0255A3" transform="translate(998,63)"/>
<path d="M0 0 C9.0788836 8.60191327 11.37855175 20.23343351 12.0625 32.25 C12.23626199 38.9498921 12.17927244 45.65400279 12.16015625 52.35546875 C12.15828797 54.29030826 12.15686601 56.22514825 12.15586853 58.1599884 C12.15207561 63.21840757 12.14227335 68.27679739 12.13116455 73.33520508 C12.1208806 78.51057539 12.11635603 83.68595051 12.11132812 88.86132812 C12.10064777 98.99090029 12.08307759 109.1204431 12.0625 119.25 C3.4825 119.25 -5.0975 119.25 -13.9375 119.25 C-18.9375 108.25 -18.9375 108.25 -19.9375 103.25 C-20.43378906 103.68570313 -20.93007813 104.12140625 -21.44140625 104.5703125 C-22.86750257 105.82051459 -24.29746132 107.06631935 -25.73046875 108.30859375 C-27.0674688 109.48468052 -28.38805965 110.68030978 -29.67578125 111.91015625 C-39.60292993 121.17391552 -53.37105341 122.7186437 -66.44140625 122.50390625 C-78.02321818 121.66276907 -88.05735083 118.06569814 -96.109375 109.6015625 C-104.83311934 98.37999393 -104.93895005 84.81713052 -103.9375 71.25 C-102.11266503 61.46624623 -96.64826144 54.71067144 -88.6875 49 C-69.63932044 37.22650208 -45.51649145 38.62247735 -23.9375 38.25 C-24.22540065 36.15778408 -24.52279511 34.06687301 -24.82421875 31.9765625 C-24.98881592 30.81205566 -25.15341309 29.64754883 -25.32299805 28.44775391 C-26.32409602 23.23822617 -28.08974788 20.58962029 -32.4375 17.4375 C-43.35225737 12.25299025 -55.99316092 15.83682128 -66.9375 19.25 C-69.8915869 20.3087503 -72.80773526 21.40387156 -75.703125 22.61328125 C-78.34931318 23.36735236 -79.40187236 23.28660623 -81.9375 22.25 C-83.30957031 20.25634766 -83.30957031 20.25634766 -84.515625 17.6640625 C-85.17304688 16.26800781 -85.17304688 16.26800781 -85.84375 14.84375 C-86.2871875 13.8640625 -86.730625 12.884375 -87.1875 11.875 C-87.64640625 10.90304688 -88.1053125 9.93109375 -88.578125 8.9296875 C-91.9375 1.69103423 -91.9375 1.69103423 -91.9375 -1.75 C-63.72079663 -13.91237214 -25.9361208 -21.11575625 0 0 Z M-61.9375 67.25 C-66.43709028 72.34068927 -67.70750509 76.93240334 -67.3515625 83.6953125 C-66.74063966 87.46459112 -65.59869344 89.52057083 -62.9375 92.25 C-56.55734631 96.15621654 -49.72665606 96.1622202 -42.4765625 94.78125 C-36.20436116 92.98307624 -31.2247004 89.79550822 -27.65234375 84.2578125 C-24.53084702 78.32808754 -23.80733513 73.13632223 -23.875 66.4375 C-23.88402344 65.27605469 -23.89304687 64.11460937 -23.90234375 62.91796875 C-23.91394531 62.03753906 -23.92554688 61.15710938 -23.9375 60.25 C-44.25741677 59.0894558 -44.25741677 59.0894558 -61.9375 67.25 Z" fill="#ED782F" transform="translate(454.9375,72.75)"/>
<path d="M0 0 C16.74521818 -0.53944327 33.84649434 3.58530159 46.34765625 15.15625 C60.10658939 28.14691784 65.78876164 44.96130287 66.47265625 63.5546875 C66.80755392 83.85785895 62.91141851 103.83667823 48.61328125 119.08984375 C44.57651508 122.7716529 40.11398523 125.51823844 35.34765625 128.15625 C34.64125 128.55714844 33.93484375 128.95804688 33.20703125 129.37109375 C18.27369633 136.9232574 -1.93091054 137.21353485 -17.69482422 132.80322266 C-33.5185995 127.57336427 -44.19961981 118.59384852 -52.38671875 104.08203125 C-61.62477457 85.49158724 -63.02436385 60.96048846 -56.65234375 41.15625 C-51.42747397 26.01894997 -43.0799545 14.52640614 -28.9375 6.6953125 C-19.6648834 2.35118534 -10.11629909 0.59595282 0 0 Z M-15.40234375 36.78125 C-24.98507014 49.50426172 -24.03020317 68.14422389 -22.15625 83.12109375 C-20.29446977 91.29399341 -16.84383058 98.48178356 -9.65234375 103.15625 C-3.1016852 106.71232178 5.17938795 106.8648765 12.25390625 104.921875 C18.50363841 102.63652518 21.48681479 99.45753314 24.66015625 93.59375 C31.26794767 79.14471277 31.46735899 60.62926705 26.5 45.58984375 C23.74406926 38.81717185 19.61051047 34.00396727 12.91796875 30.88671875 C2.41682736 27.90235182 -7.5646612 29.29982575 -15.40234375 36.78125 Z" fill="#ED782F" transform="translate(143.65234375,59.84375)"/>
<path d="M0 0 C16.98201804 -0.4763249 33.28048554 3.72133951 46.078125 15.16015625 C46.70460938 15.70542969 47.33109375 16.25070313 47.9765625 16.8125 C60.38241041 28.32447677 65.66403778 45.52779322 66.296875 62.01953125 C66.80011662 82.67902419 63.84546761 102.52249496 49.078125 118.16015625 C36.89612442 130.92832003 20.1033275 135.00203874 3.015625 135.41015625 C-14.02100403 135.22424066 -29.33139028 130.55054236 -41.74609375 118.4609375 C-55.81909998 103.57942822 -60.4684902 85.39544678 -60.2734375 65.30908203 C-59.6820835 45.06752734 -54.1818691 27.70390581 -39.171875 13.41015625 C-27.98556654 4.12836606 -14.17926097 0.77720548 0 0 Z M-14.6953125 35.890625 C-24.43487854 47.7918996 -24.08952939 64.7418416 -22.71972656 79.31005859 C-21.46064181 88.82446322 -18.41075872 96.26979036 -11.109375 102.59765625 C-3.17121479 106.48891125 4.79919592 107.111866 13.27734375 104.4765625 C19.58544863 101.77308898 23.37891513 97.08294153 26.078125 90.8515625 C30.97006052 76.90484249 31.35230358 58.00734422 26.078125 44.16015625 C23.15607916 38.32468417 19.8834301 34.18901108 14.078125 31.16015625 C4.7011093 28.10378971 -7.42778328 28.79918129 -14.6953125 35.890625 Z" fill="#0255A3" transform="translate(701.921875,59.83984375)"/>
<path d="M0 0 C-1.89297317 6.12432497 -4.15844279 12.06155039 -6.5625 18 C-6.86744385 18.76626709 -7.1723877 19.53253418 -7.48657227 20.32202148 C-9.76467508 25.88233754 -9.76467508 25.88233754 -12 27 C-13.79663086 26.50268555 -13.79663086 26.50268555 -15.96484375 25.63671875 C-16.75971191 25.32742432 -17.55458008 25.01812988 -18.37353516 24.69946289 C-19.21964355 24.36551514 -20.06575195 24.03156738 -20.9375 23.6875 C-34.31460827 18.59259052 -45.97798696 16.2873157 -60 20 C-60.96412561 24.51153425 -60.96412561 24.51153425 -60.41796875 29.00390625 C-58.39243965 31.85527091 -55.73566016 33.14093382 -52.6875 34.6875 C-52.03885986 35.0263623 -51.39021973 35.36522461 -50.72192383 35.71435547 C-44.99819174 38.63719735 -39.11113628 41.13945544 -33.1875 43.625 C-20.2693227 49.04633874 -7.45691718 54.8339423 -1 68 C2.91603229 78.44275277 2.19948081 91.17023079 -1.81640625 101.453125 C-6.11538635 110.70373564 -13.29285545 116.08973291 -22.5625 120.25 C-46.59238759 128.92019272 -73.34752289 126.02494759 -97 118 C-97 107.77 -97 97.54 -97 87 C-93.82375 88.093125 -90.6475 89.18625 -87.375 90.3125 C-64.6123199 97.96619772 -64.6123199 97.96619772 -41.125 95.6875 C-37.79958063 94.20697799 -37.79958063 94.20697799 -36 91 C-35.56769773 87.10927954 -35.45763811 84.85228297 -37.5859375 81.5078125 C-40.40942354 78.57467651 -43.3658925 76.94936078 -47 75.25 C-47.68916504 74.91492432 -48.37833008 74.57984863 -49.08837891 74.23461914 C-53.93117177 71.90455561 -58.84223353 69.74024003 -63.76464844 67.58496094 C-76.33523414 62.05917037 -90.00320891 55.66465495 -95.9375 42.3125 C-99.28644398 31.41755886 -98.94921696 19.43866961 -93.8125 9.25 C-88.04659825 -0.27044242 -78.44269798 -4.98336389 -67.9375 -7.75 C-44.98607677 -12.91188299 -21.33936398 -9.53047115 0 0 Z" fill="#0255A3" transform="translate(886,70)"/>
<path d="M0 0 C7.59 0 15.18 0 23 0 C23 9.24 23 18.48 23 28 C34.88 28 46.76 28 59 28 C59 36.91 59 45.82 59 55 C47.12 55 35.24 55 23 55 C23.0909136 66.20429283 23.0909136 66.20429283 23.20898438 77.40820312 C23.26319934 81.98149476 23.31431323 86.5546667 23.34643555 91.12817383 C23.37255001 94.81773823 23.41300871 98.50689803 23.46318626 102.19621086 C23.47980024 103.59987268 23.49134847 105.00360439 23.49761391 106.40735054 C23.4268176 116.64001809 23.4268176 116.64001809 27 126 C31.13768589 130.00421215 35.66900537 130.27171757 41.2890625 130.234375 C45.66374069 129.85616075 49.83838875 128.75138355 54.08203125 127.65625 C57 127 57 127 61 127 C61 135.91 61 144.82 61 154 C43.20796927 160.46982936 23.13575958 163.56564706 5.109375 155.74609375 C-3.04986296 151.26339864 -8.05878134 144.82365598 -11 136 C-13.14479495 126.61150384 -13.26499702 117.30757567 -13.1953125 107.734375 C-13.19157243 106.20453071 -13.18873017 104.67468399 -13.18673706 103.14483643 C-13.1791787 99.15990332 -13.15959938 95.17512099 -13.1373291 91.19024658 C-13.11670053 87.10732054 -13.10769934 83.02436962 -13.09765625 78.94140625 C-13.07634432 70.96086132 -13.04122797 62.98046691 -13 55 C-18.61 55 -24.22 55 -30 55 C-31.7820174 43.41688688 -31.7820174 43.41688688 -30 39 C-25.2470115 33.964669 -18.37592964 30.56428659 -12 28 C-11.34 28 -10.68 28 -10 28 C-9.86464844 27.48695312 -9.72929688 26.97390625 -9.58984375 26.4453125 C-7.042063 17.38314624 -3.45917344 8.74583473 0 0 Z" fill="#0255A3" transform="translate(930,35)"/>
<path d="M0 0 C-0.62066727 3.50966963 -1.53330332 6.68727261 -2.8125 10.01171875 C-3.16570312 10.93404297 -3.51890625 11.85636719 -3.8828125 12.80664062 C-4.25148438 13.75732422 -4.62015625 14.70800781 -5 15.6875 C-5.36867188 16.64978516 -5.73734375 17.61207031 -6.1171875 18.60351562 C-8.83363412 25.66726824 -8.83363412 25.66726824 -10 28 C-13.68933657 27.37675285 -17.12698298 26.31456499 -20.67211914 25.13256836 C-30.72394944 21.86833192 -42.46983234 19.13045339 -52.625 23.5625 C-60.54056142 28.55996262 -63.52169501 35.47260838 -65.52124023 44.30151367 C-66.36677659 49.06730325 -66.22646054 53.85896736 -66.25 58.6875 C-66.270625 59.72583984 -66.29125 60.76417969 -66.3125 61.83398438 C-66.36245947 71.79465373 -64.50275378 81.15485469 -58 89 C-50.36391449 95.89821657 -42.05442111 95.59673209 -32.21435547 95.17919922 C-21.73376574 94.33104565 -13.33927425 89.66963712 -4 85 C-4 95.56 -4 106.12 -4 117 C-25.60741972 126.97265526 -47.53425615 129.19364577 -70.3515625 121.93359375 C-82.98195254 117.0892796 -91.9103689 108.82565783 -97.75 96.625 C-107.02374156 74.81340391 -107.1704241 46.82470438 -98.8125 24.6875 C-92.73037525 11.34664898 -83.34413898 1.70392705 -69.79296875 -3.97265625 C-49.08659949 -11.58912494 -19.10498467 -12.73665644 0 0 Z" fill="#ED782F" transform="translate(334,69)"/>
<path d="M0 0 C11.88 0 23.76 0 36 0 C36 59.4 36 118.8 36 180 C24.12 180 12.24 180 0 180 C0 120.6 0 61.2 0 0 Z" fill="#ED782F" transform="translate(20,12)"/>
</svg>`;

// ─── Google Business Profile icon (G logo in circle, PDF-safe SVG) ───────────
const GBP_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="12" fill="#ffffff" opacity="0.15"/>
  <text x="12" y="16.5" text-anchor="middle" font-size="13" font-weight="700" font-family="Arial,sans-serif" fill="#ffffff">G</text>
</svg>`;

// ─── Inline SVG Icons (PDF-safe, no emoji) ──────────────────────────────────
const ICONS: Record<string, string> = {
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  mapPin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  mousePointer: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>`,
  navigation: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
  phone: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  smartphone: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  monitor: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  map: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  starEmpty: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  messageSquare: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  trendingUp: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  trendingDown: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  key: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  barChart: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
  zap: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
};

function formatUtcCalendarDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function icon(name: string, color = "currentColor", size = 14): string {
  const raw = ICONS[name] || "";
  return raw
    .replace(/width="\d+"/, `width="${size}"`)
    .replace(/height="\d+"/, `height="${size}"`)
    .replace(/stroke="currentColor"/g, `stroke="${color}"`)
    .replace(/fill="currentColor"/g, `fill="${color}"`);
}

// ─── Donut SVG helper ────────────────────────────────────────────────────────
function donutSvg(
  pct: number,
  color1: string,
  color2: string,
  label: string,
): string {
  const r = 54;
  const cx = 70;
  const cy = 70;
  const circ = 2 * Math.PI * r;
  const dash1 = (pct / 100) * circ;
  const dash2 = circ - dash1;
  return `
    <svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color2}" stroke-width="16"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color1}" stroke-width="16"
        stroke-dasharray="${dash1} ${dash2}"
        stroke-dashoffset="${circ / 4}"
        stroke-linecap="round"
        transform="rotate(-90 ${cx} ${cy})"/>
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="10" fill="#64748b" font-family="Georgia, serif">${label}</text>
      <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="18" font-weight="700" fill="#0f172a" font-family="Georgia, serif">${Math.round(pct)}%</text>
    </svg>
  `;
}

// ─── Main function ───────────────────────────────────────────────────────────
export function renderPerformanceReportHtml(params: {
  performanceData: PerformanceDataItem[];
  reviewData: ReviewDataForPdf;
  searchKeywords: SearchKeywordForPdf[];
  locationName: string;
  locationAddress: string;
  locationLogoUrl?: string;
  startDate: Date;
  endDate: Date;
  brandName?: string;
  brandLogoUrl?: string;
}): string {
  const {
    performanceData,
    reviewData,
    searchKeywords,
    locationName,
    locationAddress,
    locationLogoUrl,
    startDate,
    endDate,
    brandName,
    brandLogoUrl,
  } = params;

  const formattedStartDate = formatUtcCalendarDate(startDate);
  const formattedEndDate = formatUtcCalendarDate(endDate);
  const reportBrandDisplayName = brandName?.trim() || locationName || "Business";
  const headerLogoMarkup = brandLogoUrl
    ? `<div style="display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 4px 14px rgba(15,23,42,0.08);"><img src="${brandLogoUrl}" alt="${reportBrandDisplayName} logo" style="height:30px;max-width:180px;object-fit:contain;" /></div>`
    : LOCAPOSTY_LOGO;
  const locationMetaLeadingMarkup = locationLogoUrl
    ? `<span style="display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:28px;height:28px;border-radius:999px;overflow:hidden;background:#ffffff;border:1px solid rgba(255,255,255,0.4);box-shadow:0 4px 10px rgba(15,23,42,0.18);"><img src="${locationLogoUrl}" alt="${locationName || reportBrandDisplayName} location logo" style="width:100%;height:100%;object-fit:cover;" /></span>`
    : icon("mapPin", "#93c5fd", 14);

  const totalViews = performanceData.reduce((s, i) => s + i.views, 0);
  const totalClicks = performanceData.reduce((s, i) => s + i.clicks, 0);
  const totalCalls = performanceData.reduce((s, i) => s + i.calls, 0);
  const totalDirections = performanceData.reduce((s, i) => s + i.directions, 0);

  let mobileViews = 0,
    desktopViews = 0,
    searchViews = 0,
    mapsViews = 0;
  performanceData.forEach((item) => {
    const mm = Number(item.mobileMapViews || 0);
    const ms = Number(item.mobileSearchViews || 0);
    const dm = Number(item.desktopMapViews || 0);
    const ds = Number(item.desktopSearchViews || 0);
    mobileViews += mm + ms;
    desktopViews += dm + ds;
    searchViews += ms + ds;
    mapsViews += mm + dm;
  });

  const mobilePct = (mobileViews / (mobileViews + desktopViews || 1)) * 100;
  const searchPct = (searchViews / (searchViews + mapsViews || 1)) * 100;

  // Rating bars
  const rd = reviewData?.summary?.ratingDistribution;
  const totalR = reviewData?.summary?.totalReviews || 1;
  function ratingBar(count: number, color: string, stars: number): string {
    const pct = (count / totalR) * 100;
    const starsFilled = Array.from(
      { length: 5 },
      (_, i) =>
        `<span style="color:${i < stars ? color : "#d1d5db"};">${icon("star", i < stars ? color : "#d1d5db", 12)}</span>`,
    ).join("");
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="display:flex;gap:2px;width:74px;">${starsFilled}</div>
        <div style="flex:1;background:#f1f5f9;border-radius:4px;height:10px;overflow:hidden;">
          <div style="width:${pct.toFixed(1)}%;height:100%;background:${color};border-radius:4px;"></div>
        </div>
        <div style="width:28px;text-align:right;font-size:12px;color:#64748b;">${count}</div>
      </div>`;
  }

  // Monthly call bars
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthlyData: Record<string, { totalCalls: number; daysCount: number }> =
    {};
  const monthOrder: string[] = [];
  const seenMonths = new Set<string>();

  performanceData.forEach((item) => {
    try {
      let parsedDate = parse(item.date, "MMM dd, yyyy", new Date());
      if (isNaN(parsedDate.getTime())) parsedDate = new Date(item.date);
      const key = `${monthNames[parsedDate.getMonth()]} ${parsedDate.getFullYear()}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { totalCalls: 0, daysCount: 0 };
      }
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        monthOrder.push(key);
      }
      monthlyData[key].totalCalls += item.calls || 0;
      monthlyData[key].daysCount += 1;
    } catch {}
  });

  monthOrder.sort((a, b) => {
    const [am, ay] = [a.slice(0, 3), parseInt(a.slice(4))];
    const [bm, by] = [b.slice(0, 3), parseInt(b.slice(4))];
    return ay !== by
      ? ay - by
      : monthNames.indexOf(am) - monthNames.indexOf(bm);
  });

  const formattedMonths = [...new Set(monthOrder)].map((key) => ({
    key,
    calls: monthlyData[key].totalCalls,
    days: monthlyData[key].daysCount,
    partial: monthlyData[key].daysCount < 28,
  }));

  const maxCalls = Math.max(...formattedMonths.map((m) => m.calls), 30);
  const yMax = Math.ceil(maxCalls / 10) * 10;

  const callBarsHtml = formattedMonths
    .map((m) => {
      const h = Math.round((m.calls / yMax) * 180);
      return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
        <div style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:4px;">${m.calls}</div>
        <div style="width:32px;height:${h}px;background:linear-gradient(180deg,#2563eb,#1d4ed8);border-radius:4px 4px 0 0;min-height:4px;"></div>
        <div style="font-size:10px;color:#94a3b8;margin-top:6px;text-align:center;">${m.key}</div>
      </div>`;
    })
    .join("");

  // Month-over-month
  const momRows = formattedMonths
    .slice(1)
    .map((m, i) => {
      const prev = formattedMonths[i];
      const chg =
        prev.calls > 0 ? ((m.calls - prev.calls) / prev.calls) * 100 : 0;
      const up = chg >= 0;
      return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:6px;">
        <span style="font-size:12px;color:#475569;">${prev.key} → ${m.key}</span>
        <span style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color:${up ? "#059669" : "#dc2626"};">
          ${icon(up ? "trendingUp" : "trendingDown", up ? "#059669" : "#dc2626", 13)}
          ${up ? "+" : ""}${chg.toFixed(1)}%
        </span>
      </div>`;
    })
    .join("");

  const keywordsHtml = searchKeywords
    .slice(0, 10)
    .map((kw, i) => {
      const max = searchKeywords[0]?.impressions || 1;
      const pct = (kw.impressions / max) * 100;
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <div style="width:22px;height:22px;background:#eff6ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#2563eb;">${i + 1}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:#1e293b;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${kw.keyword}</div>
          <div style="margin-top:4px;background:#e2e8f0;border-radius:4px;height:6px;overflow:hidden;">
            <div style="width:${pct.toFixed(1)}%;height:100%;background:linear-gradient(90deg,#2563eb,#60a5fa);border-radius:4px;"></div>
          </div>
        </div>
        <div style="font-size:12px;color:#64748b;white-space:nowrap;">${kw.impressions.toLocaleString()} impr.</div>
      </div>`;
    })
    .join("");

  const hasDeviceData = mobileViews > 0 || desktopViews > 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Report — ${reportBrandDisplayName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', Georgia, sans-serif;
      background: #f0f4ff;
      color: #1e293b;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      max-width: 900px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .report-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%);
      border-radius: 20px 20px 0 0;
      padding: 40px 40px 32px;
      position: relative;
      overflow: hidden;
    }
    .report-header::before {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 280px; height: 280px;
      border-radius: 50%;
      background: rgba(96,165,250,0.12);
    }
    .report-header::after {
      content: '';
      position: absolute;
      bottom: -40px; left: 30%;
      width: 180px; height: 180px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 999px;
      margin-bottom: 16px;
    }
    .report-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 36px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
    }
    .header-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #bfdbfe;
      font-weight: 500;
    }
    .meta-row svg { flex-shrink: 0; opacity: 0.8; }

    /* ── Body ── */
    .report-body {
      background: #ffffff;
      border-radius: 0 0 20px 20px;
      padding: 36px 40px;
      border: 1px solid #e2e8f0;
      border-top: none;
      box-shadow: 0 20px 60px rgba(15,23,42,0.1);
    }

    /* ── Section ── */
    .section { margin-bottom: 36px; }
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 2px solid #f1f5f9;
    }
    .section-icon {
      width: 32px; height: 32px;
      background: #eff6ff;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
    }
    .section-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    /* ── Metric Cards ── */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 16px;
      position: relative;
      overflow: hidden;
    }
    .metric-card::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 3px;
      border-radius: 0 0 14px 14px;
    }
    .metric-card.blue::after   { background: linear-gradient(90deg, #2563eb, #60a5fa); }
    .metric-card.green::after  { background: linear-gradient(90deg, #059669, #34d399); }
    .metric-card.amber::after  { background: linear-gradient(90deg, #d97706, #fbbf24); }
    .metric-card.rose::after   { background: linear-gradient(90deg, #e11d48, #fb7185); }

    .metric-icon {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 10px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1;
      font-family: 'Playfair Display', Georgia, serif;
    }

    /* ── Two-col ── */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
    }

    /* ── Page break ── */
    .page-break { page-break-before: always; padding-top: 8px; }

    /* ── Divider ── */
    .divider {
      height: 1px;
      background: #f1f5f9;
      margin: 28px 0;
    }

    /* ── Footer ── */
    .report-footer {
      text-align: center;
      margin-top: 28px;
      font-size: 11px;
      color: #94a3b8;
      letter-spacing: 0.03em;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ── HEADER ─────────────────────────────────────── -->
  <div class="report-header">

    <!-- Top bar: logo left, GBP badge right -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${headerLogoMarkup}
      </div>
      <div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:999px;padding:6px 14px;">
        ${GBP_ICON}
        <span style="font-size:11px;font-weight:700;color:#e0e7ff;letter-spacing:0.06em;text-transform:uppercase;">Google Business Profile</span>
      </div>
    </div>

    <!-- Title + meta -->
    <div style="display:flex;flex-direction:column;gap:8px;">
<div style="font-size:11px;font-weight:700;color:#93c5fd;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Performance Report</div>
      <div style="text-align:right;">
        <div class="header-meta" style="align-items:flex-end;">
          <div class="meta-row" style="justify-content:flex-end;">
            ${icon("calendar", "#93c5fd", 14)}
            <span>${formattedStartDate} &ndash; ${formattedEndDate}</span>
          </div>
          <div class="meta-row" style="justify-content:flex-end;">
            ${icon("star", "#93c5fd", 14)}
            <span>${reportBrandDisplayName}</span>
          </div>
          ${locationName ? `<div class="meta-row" style="justify-content:flex-end;align-items:flex-start;gap:10px;max-width:560px;">${locationMetaLeadingMarkup}<span style="display:block;line-height:1.45;text-align:left;">${locationName}${locationAddress ? ` &bull; ${locationAddress}` : ""}</span></div>` : ""}
        </div>
      </div>
    </div>

    <!-- Brand accent line -->
    <div style="margin-top:24px;height:2px;background:linear-gradient(90deg,#ED782F,#0255A3,rgba(255,255,255,0));border-radius:2px;"></div>
  </div>

  <!-- ── BODY ───────────────────────────────────────── -->
  <div class="report-body">

    <!-- Overview -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">${icon("barChart", "#2563eb", 16)}</div>
        <div class="section-title">Overview Snapshot</div>
      </div>
      <div class="metrics-grid">
        <div class="metric-card blue">
          <div class="metric-icon">${icon("eye", "#2563eb", 13)} Total Views</div>
          <div class="metric-value">${totalViews.toLocaleString()}</div>
        </div>
        <div class="metric-card green">
          <div class="metric-icon">${icon("mousePointer", "#059669", 13)} Website Clicks</div>
          <div class="metric-value">${totalClicks.toLocaleString()}</div>
        </div>
        <div class="metric-card amber">
          <div class="metric-icon">${icon("navigation", "#d97706", 13)} Directions</div>
          <div class="metric-value">${totalDirections.toLocaleString()}</div>
        </div>
        <div class="metric-card rose">
          <div class="metric-icon">${icon("phone", "#059669", 13)} Phone Calls</div>
          <div class="metric-value">${totalCalls.toLocaleString()}</div>
        </div>
      </div>
    </div>

    ${
      hasDeviceData
        ? `
    <div class="divider page-break"></div>

    <!-- Device & Platform -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">${icon("smartphone", "#2563eb", 16)}</div>
        <div class="section-title">Device &amp; Platform Breakdown</div>
      </div>
      <div class="two-col">
        <div style="text-align:center;">
          <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">${icon("smartphone", "#475569", 12)} Mobile vs Desktop</div>
          ${donutSvg(mobilePct, "#2563eb", "#e0e7ff", "Mobile")}
          <div style="display:flex;justify-content:center;gap:18px;margin-top:12px;">
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#475569;">
              <div style="width:10px;height:10px;background:#2563eb;border-radius:2px;"></div>
              Mobile (${Math.round(mobilePct)}%)
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#475569;">
              <div style="width:10px;height:10px;background:#e0e7ff;border-radius:2px;border:1px solid #c7d2fe;"></div>
              Desktop (${100 - Math.round(mobilePct)}%)
            </div>
          </div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">${icon("search", "#475569", 12)} Search vs Maps</div>
          ${donutSvg(searchPct, "#059669", "#d1fae5", "Search")}
          <div style="display:flex;justify-content:center;gap:18px;margin-top:12px;">
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#475569;">
              <div style="width:10px;height:10px;background:#059669;border-radius:2px;"></div>
              Search (${Math.round(searchPct)}%)
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#475569;">
              <div style="width:10px;height:10px;background:#d1fae5;border-radius:2px;border:1px solid #a7f3d0;"></div>
              Maps (${100 - Math.round(searchPct)}%)
            </div>
          </div>
        </div>
      </div>
    </div>
    `
        : ""
    }

    ${
      reviewData
        ? `
    <div class="divider page-break"></div>

    <!-- Reviews -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">${icon("star", "#f59e0b", 16)}</div>
        <div class="section-title">Reviews Summary</div>
      </div>
      <div class="two-col">
        <div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
            <div class="metric-card blue" style="padding:14px;">
              <div class="metric-icon">${icon("messageSquare", "#2563eb", 12)} Total Reviews</div>
              <div class="metric-value" style="font-size:22px;">${reviewData.summary.totalReviews.toLocaleString()}</div>
            </div>
            <div class="metric-card amber" style="padding:14px;">
              <div class="metric-icon">${icon("star", "#d97706", 12)} Avg Rating</div>
              <div class="metric-value" style="font-size:22px;">${reviewData.summary.averageRating.toFixed(1)}</div>
            </div>
            <div class="metric-card green" style="padding:14px;">
              <div class="metric-icon">${icon("trendingUp", "#059669", 12)} Reply Rate</div>
              <div class="metric-value" style="font-size:22px;">${reviewData.summary.replyRate.toFixed(1)}%</div>
            </div>
            <div class="metric-card rose" style="padding:14px;">
              <div class="metric-icon">${icon("clock", "#e11d48", 12)} Avg Response</div>
              <div class="metric-value" style="font-size:22px;">${reviewData.summary.averageReplyResponseTime}h</div>
            </div>
          </div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px;">Rating Distribution</div>
          ${ratingBar(rd.fiveStar, "#059669", 5)}
          ${ratingBar(rd.fourStar, "#2563eb", 4)}
          ${ratingBar(rd.threeStar, "#d97706", 3)}
          ${ratingBar(rd.twoStar, "#f97316", 2)}
          ${ratingBar(rd.oneStar, "#e11d48", 1)}
        </div>
      </div>
    </div>
    `
        : ""
    }

    ${
      searchKeywords && searchKeywords.length > 0
        ? `
    <div class="divider page-break"></div>

    <!-- Keywords -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">${icon("key", "#2563eb", 16)}</div>
        <div class="section-title">Top Search Keywords</div>
      </div>
      ${keywordsHtml}
    </div>
    `
        : ""
    }

    ${
      totalCalls > 0 && formattedMonths.length > 0
        ? `
    <div class="divider page-break"></div>

    <!-- Phone Calls Chart -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">${icon("phone", "#2563eb", 16)}</div>
        <div class="section-title">Monthly Phone Calls</div>
      </div>

      <div style="display:flex;align-items:flex-end;gap:8px;height:220px;padding:10px 0 0;border-bottom:2px solid #f1f5f9;margin-bottom:12px;">
        ${callBarsHtml}
      </div>

      ${
        formattedMonths.length > 1
          ? `
      <div style="margin-top:18px;">
        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Month-over-Month Changes</div>
        ${momRows}
      </div>
      `
          : ""
      }
    </div>
    `
        : ""
    }

    <!-- Footer -->
    <div class="report-footer">
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px;">
        <div style="height:1px;width:60px;background:#e2e8f0;"></div>
        ${LOCAPOSTY_LOGO.replace('width="120"', 'width="80"')
          .replace('height="29"', 'height="19"')
          .replace(/#0255A3/g, "#94a3b8")
          .replace(/#ED782F/g, "#cbd5e1")}
        <div style="height:1px;width:60px;background:#e2e8f0;"></div>
      </div>
      <div>Generated on ${format(new Date(), "MMMM dd, yyyy 'at' h:mm a")} &bull; Google Business Profile Insights for ${reportBrandDisplayName}</div>
    </div>

  </div><!-- /report-body -->
</div><!-- /page -->
</body>
</html>`;

  return html;
}
