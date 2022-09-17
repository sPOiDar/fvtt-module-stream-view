# [1.2.0](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v1.1.1...v1.2.0) (2022-09-17)


### Features

* **audio:** Play ambient sounds for the stream view from camera center ([d9493b2](https://github.com/sPOiDar/fvtt-module-stream-view/commit/d9493b2)), closes [#26](https://github.com/sPOiDar/fvtt-module-stream-view/issues/26)
* **core:** Allow disabling of combatant tracking ([b7a1cde](https://github.com/sPOiDar/fvtt-module-stream-view/commit/b7a1cde)), closes [#31](https://github.com/sPOiDar/fvtt-module-stream-view/issues/31)
* **keybinds:** Enable keybinds for most useful functionality ([ee89719](https://github.com/sPOiDar/fvtt-module-stream-view/commit/ee89719)), closes [#13](https://github.com/sPOiDar/fvtt-module-stream-view/issues/13)
* **popouts:** Allow setting popouts to a fixed size/position ([0dfd3b1](https://github.com/sPOiDar/fvtt-module-stream-view/commit/0dfd3b1)), closes [#28](https://github.com/sPOiDar/fvtt-module-stream-view/issues/28)




## [1.1.1](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v1.1.0...v1.1.1) (2022-09-11)


### Bug Fixes

* **translations:** Add missing translation for clear tracked tokens btn ([3f01a0d](https://github.com/sPOiDar/fvtt-module-stream-view/commit/3f01a0d))




# [1.1.0](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v1.0.0...v1.1.0) (2022-09-11)


### Features

* **camera:** Add the ability to track specific tokens for auto camera ([375b7bb](https://github.com/sPOiDar/fvtt-module-stream-view/commit/375b7bb)), closes [#24](https://github.com/sPOiDar/fvtt-module-stream-view/issues/24)




# [1.0.0](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.4.4...v1.0.0) (2022-09-10)


### Bug Fixes

* **compatibility:** Update for compatibility with core v10 ([45c9bc6](https://github.com/sPOiDar/fvtt-module-stream-view/commit/45c9bc6)), closes [#27](https://github.com/sPOiDar/fvtt-module-stream-view/issues/27)


### BREAKING CHANGES

* **compatibility:** Due to some fundamental changes in v10, this and future
versions will not maintain backwards compatibility for Foundry versions
prior to v10.




## [0.4.4](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.4.3...v0.4.4) (2022-05-15)




## [0.4.3](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.4.2...v0.4.3) (2022-05-14)


### Bug Fixes

* **docs:** Remote TODO for camera preview, has been implemented. ([9499b52](https://github.com/sPOiDar/fvtt-module-stream-view/commit/9499b52))




## [0.4.2](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.4.1...v0.4.2) (2021-12-25)


### Bug Fixes

* **compatibility:** Bump core compat to v9 ([85e0fac](https://github.com/sPOiDar/fvtt-module-stream-view/commit/85e0fac))




## [0.4.1](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.4.0...v0.4.1) (2021-12-13)


### Bug Fixes

* **compatibility:** Correctly query game version for both v0.8/v9 ([2287c93](https://github.com/sPOiDar/fvtt-module-stream-view/commit/2287c93))




# [0.4.0](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.3.0...v0.4.0) (2021-12-03)


### Bug Fixes

* **camera:** Fix undefined scale in `animateTo` ([4bcd497](https://github.com/sPOiDar/fvtt-module-stream-view/commit/4bcd497))
* **compatibility:** Update layer instantiation for core v9 compat ([5d4e4c7](https://github.com/sPOiDar/fvtt-module-stream-view/commit/5d4e4c7))


### Features

* **UI:** Add option to display preview of camera bounds on GM display ([84623b6](https://github.com/sPOiDar/fvtt-module-stream-view/commit/84623b6))




# [0.3.0](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.2.4...v0.3.0) (2021-10-30)


### Features

* **camera:** Do not track directed camera on inactive scenes ([1fcc505](https://github.com/sPOiDar/fvtt-module-stream-view/commit/1fcc505)), closes [#9](https://github.com/sPOiDar/fvtt-module-stream-view/issues/9)




## [0.2.4](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.2.3...v0.2.4) (2021-09-11)


### Bug Fixes

* **bubbles:** Allow bubbles to function even if speech focus is disabled ([6a0603a](https://github.com/sPOiDar/fvtt-module-stream-view/commit/6a0603a))




## [0.2.3](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.2.2...v0.2.3) (2021-09-11)


### Bug Fixes

* **bubbles:** Honor show-speech-bubbles setting ([1fbd608](https://github.com/sPOiDar/fvtt-module-stream-view/commit/1fbd608))
* **camera:** Avoid triggering re-focus when pan to speaking disabled ([8fdc20e](https://github.com/sPOiDar/fvtt-module-stream-view/commit/8fdc20e))
* **camera:** await on canvas.animatePan in prep for animation chaining ([8efcfc9](https://github.com/sPOiDar/fvtt-module-stream-view/commit/8efcfc9))




## [0.2.2](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.2.1...v0.2.2) (2021-09-11)


### Bug Fixes

* **camera:** Honor pan on user speaking setting ([14db2ce](https://github.com/sPOiDar/fvtt-module-stream-view/commit/14db2ce))


### Reverts

* Revert "fix(camera): Honor pan on user speaking setting" ([f35ef0d](https://github.com/sPOiDar/fvtt-module-stream-view/commit/f35ef0d))




## [0.2.1](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.2.0...v0.2.1) (2021-09-10)


### Bug Fixes

* **camera:** Honor pan on user speaking setting ([b26d243](https://github.com/sPOiDar/fvtt-module-stream-view/commit/b26d243))




# [0.2.0](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.11...v0.2.0) (2021-09-10)


### Bug Fixes

* **docs:** Update README to clarify that stream user must be dedicated ([49aca91](https://github.com/sPOiDar/fvtt-module-stream-view/commit/49aca91))
* **settings:** Allow camera mode setting to be updated without refresh. ([e775877](https://github.com/sPOiDar/fvtt-module-stream-view/commit/e775877))


### Features

* **ui:** Add a setting to enable the full sidebar for settings access ([6ab0f6d](https://github.com/sPOiDar/fvtt-module-stream-view/commit/6ab0f6d))




## [0.1.11](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.10...v0.1.11) (2021-08-30)


### Bug Fixes

* **chat:** Wrap ChatLog.scrollBottom() to always scroll chat popouts ([f9b79cf](https://github.com/sPOiDar/fvtt-module-stream-view/commit/f9b79cf))




## [0.1.10](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.9...v0.1.10) (2021-08-22)


### Bug Fixes

* **compatibility:** Bump core compat to v0.8.9 ([2d0e91c](https://github.com/sPOiDar/fvtt-module-stream-view/commit/2d0e91c))




## [0.1.9](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.8...v0.1.9) (2021-08-12)


### Bug Fixes

* **compatibility:** Check SmallTimeApp is defined before referencing ([4e861dd](https://github.com/sPOiDar/fvtt-module-stream-view/commit/4e861dd))




## [0.1.8](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.7...v0.1.8) (2021-08-12)


### Bug Fixes

* **compatibility:** Explicitly exclude popout tracking for SmallTime ([380f244](https://github.com/sPOiDar/fvtt-module-stream-view/commit/380f244))
* **popouts:** Add support for auto-hiding actors and items/spells/etc ([d9077f0](https://github.com/sPOiDar/fvtt-module-stream-view/commit/d9077f0))


### Reverts

* Revert "fix(popouts): Only track and auto-close ImagePopout and JournalSheet" ([c66f832](https://github.com/sPOiDar/fvtt-module-stream-view/commit/c66f832))




## [0.1.7](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.6...v0.1.7) (2021-08-06)


### Bug Fixes

* **popouts:** Only track and auto-close ImagePopout and JournalSheet ([490534d](https://github.com/sPOiDar/fvtt-module-stream-view/commit/490534d))




## [0.1.6](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.5...v0.1.6) (2021-07-14)


### Bug Fixes

* **combat:** Handle missing combatant token ([175d9f4](https://github.com/sPOiDar/fvtt-module-stream-view/commit/175d9f4)), closes [#5](https://github.com/sPOiDar/fvtt-module-stream-view/issues/5)
* **combat:** Hide combat tracker in Directed camera mode ([3cd0bb9](https://github.com/sPOiDar/fvtt-module-stream-view/commit/3cd0bb9)), closes [#3](https://github.com/sPOiDar/fvtt-module-stream-view/issues/3)




## [0.1.5](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.4...v0.1.5) (2021-07-14)


### Bug Fixes

* **combat:** Display combat tracker in Directed camera mode ([d1bbf16](https://github.com/sPOiDar/fvtt-module-stream-view/commit/d1bbf16)), closes [#3](https://github.com/sPOiDar/fvtt-module-stream-view/issues/3)




## [0.1.4](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.3...v0.1.4) (2021-07-13)


### Bug Fixes

* **compatibility:** Bump core compat to v0.8.8 ([1743e09](https://github.com/sPOiDar/fvtt-module-stream-view/commit/1743e09))
* **core:** Do not attempt updating scene if canvas is not initialized ([4f67634](https://github.com/sPOiDar/fvtt-module-stream-view/commit/4f67634))
* **core:** Do not offer GMs as candidate users for Stream View ([796e997](https://github.com/sPOiDar/fvtt-module-stream-view/commit/796e997))




## [0.1.3](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.2...v0.1.3) (2021-06-21)


### Bug Fixes

* **core:** Honor settings to hide chat/combat log ([4b159db](https://github.com/sPOiDar/fvtt-module-stream-view/commit/4b159db)), closes [#1](https://github.com/sPOiDar/fvtt-module-stream-view/issues/1)




## [0.1.2](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.1...v0.1.2) (2021-06-20)


### Bug Fixes

* **camera:** Update focus on scene change ([60dd28b](https://github.com/sPOiDar/fvtt-module-stream-view/commit/60dd28b))




## [0.1.1](https://github.com/sPOiDar/fvtt-module-stream-view/compare/v0.1.0...v0.1.1) (2021-06-03)


### Bug Fixes

* **packaging:** Add module description ([5b8f386](https://github.com/sPOiDar/fvtt-module-stream-view/commit/5b8f386))




# [0.1.0](https://github.com/sPOiDar/fvtt-module-stream-view/compare/0.0.0...v0.1.0) (2021-06-03)


### Features

* **core:** Initial import ([b7c58a5](https://github.com/sPOiDar/fvtt-module-stream-view/commit/b7c58a5))




