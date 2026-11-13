# Devices Usage Maps

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Validate](https://github.com/babounx/ha-devices-usage-maps/actions/workflows/validate.yml/badge.svg)](https://github.com/babounx/ha-devices-usage-maps/actions/workflows/validate.yml)

*[Version française plus bas](#version-française)*

See at a glance **what every device in Home Assistant is used for**: which automations, scripts and scenes use it, which dashboard views show it, whether it feeds the Energy dashboard, and which devices are used nowhere.

- **Overview**: Home Assistant in the centre, your integrations grouped by family (radio & protocols, cameras, local network, cloud, system, helpers). Each bubble shows the number of devices and the share used somewhere.
- **By device**: a diagram *Integration → Device → Entities → Automations / scripts / scenes / dashboard views / Energy*, plus a table of every entity.
- **By automation**: the reverse view — every device and area an automation, script or scene touches.
- **Search**: type an entity id (or part of it, e.g. `position_bureau`), a device or an automation name, and see every place it appears — devices, automations, scripts, scenes (anywhere in their configuration, templates included), dashboard views, **YAML files of the configuration folder** (file and line) and UI helpers (groups, templates, min/max…).
- **Device health**: one table of the devices that cause trouble — offline (and for how long), partly offline, unstable (drop-outs counted over the last 24 h of history), dead Z-Wave nodes, low batteries, entities no longer provided — ranked by severity, with what depends on each device.
- **Broken references**: lists every entity, device, area, label or action that an automation, script, scene or dashboard still uses although it no longer exists (renamed or deleted entity, removed device, entity no longer provided by its integration, missing action), with the step where it is used and a guess at what a renamed entity became.
- **Everything is clickable**: devices, entities, automations, scripts, scenes, integrations, areas, dashboard views and the Energy dashboard open directly in Home Assistant.
- **Live**: data is read from Home Assistant when the page opens and refreshed automatically when devices, entities, automations, scripts, scenes or dashboards change.
- **Your language**: follows each user's Home Assistant language (English and French included, contributions welcome).

## Installation

### HACS (recommended)
1. HACS › ⋮ › **Custom repositories** › add `https://github.com/babounx/ha-devices-usage-maps`, type **Integration**.
2. Install **Devices Usage Maps**, then restart Home Assistant.
3. **Settings › Devices & services › Add integration › Devices Usage Maps**.

### Manual
Copy `custom_components/devices_usage_maps` into your `config/custom_components/` folder, restart, then add the integration as above.

## Card or sidebar page — you choose

| | How to enable |
|---|---|
| **Sidebar page** | In the integration's **options**, switch **Show in the sidebar** on or off. Title and icon can be changed there too. |
| **Dashboard card** | Always available. Edit a dashboard › Add card › **Devices Usage Maps**. No resource to add by hand. For a full-page layout, put it in a view of type *Panel*. |

### Card options

```yaml
type: custom:devices-usage-maps-card
view: overview        # overview | devices | automations | health | broken
show_services: false  # include service devices (HACS, add-ons, weather…)
height: 900           # optional, in px; scrolls inside the card
```

All options are available in the visual editor.

## How usage is detected

| Source | Method |
|---|---|
| Automations, scripts, scenes | Home Assistant's own *Related* search, plus a scan of each automation/script configuration to catch entities only referenced in templates (marked *in a template*). |
| Groups | An item that uses a group (light group, `group.*`, sensor group…) also uses the group's members (marked *via group*). |
| Dashboards | Every storage and YAML dashboard configuration is scanned, view by view. |
| Energy | Every sensor configured in the Energy dashboard. |

**Requirements**: Home Assistant 2024.12 or newer, and an **administrator account** (the *Related* search and automation configurations are admin-only).

**Limits**: entities built dynamically in templates (for example `states('sensor.' ~ name)`) cannot be detected. Strategy dashboards (generated automatically) contain no entity list.

## Releasing

The version number appears in `manifest.json`, `const.py`, `frontend/devices-usage-maps.js` and in the `?v=` suffix of every frontend import (so browsers never mix old and new files). Update all of them, then publish a GitHub release whose tag matches (for example `v1.3.0`) so HACS offers the update.

## Translations

Translations live in `custom_components/devices_usage_maps/frontend/src/translations/` (interface) and `custom_components/devices_usage_maps/translations/` (setup dialog). To add a language, copy `en.js` / `en.json`, translate the values and register the file in `frontend/src/i18n.js`.

## Privacy

Nothing leaves your Home Assistant and nothing is written. The integration serves the frontend files and one read-only, admin-only WebSocket command used by the search: it reads the `.yaml` files of the configuration folder (never `secrets.yaml`, `.storage` or `custom_components`) and the options of config entries. Everything else is read in your browser through Home Assistant's WebSocket API.

## License

Devices Usage Maps is free software, released under the [GNU General Public License v3.0](LICENSE).
You may redistribute and modify it under the terms of that license; any distributed modified version must remain under GPL-3.0 and publish its source code.

---

## Version française

Voyez d'un coup d'œil **à quoi sert chaque appareil de Home Assistant** : les automatisations, scripts et scènes qui l'utilisent, les vues de tableau de bord qui l'affichent, s'il alimente le tableau Énergie, et quels appareils ne servent nulle part.

- **Vue d'ensemble** : Home Assistant au centre, vos intégrations regroupées par famille. Chaque bulle indique le nombre d'appareils et la part utilisée.
- **Par appareil** : schéma *Intégration → Appareil → Entités → Automatisations / scripts / scènes / vues / Énergie*, et tableau de toutes les entités.
- **Par automatisation** : la vue inverse, avec les appareils et pièces touchés.
- **Recherche** : tapez un entity_id (ou une partie, par ex. `position_bureau`), un appareil ou une automatisation, et voyez tous les endroits où il apparaît — appareils, automatisations, scripts, scènes (n'importe où dans leur configuration, templates compris), vues de tableaux de bord, **fichiers YAML du dossier de configuration** (fichier et ligne) et entrées d'aide (groupes, modèles, min/max…).
- **Santé** : un tableau des appareils qui posent problème — hors ligne (et depuis quand), partiellement hors ligne, instables (coupures comptées sur les dernières 24 h), nœuds Z-Wave morts, batteries faibles, entités plus fournies — classés par gravité, avec ce qui dépend de chacun.
- **Références cassées** : tout ce qu'une automatisation, un script, une scène ou un tableau de bord utilise encore alors que cela n'existe plus (entité renommée ou supprimée, appareil retiré, entité plus fournie par son intégration, action disparue), avec l'étape concernée et une proposition quand l'entité semble avoir été renommée.
- **Tout est cliquable** et ouvre directement la page correspondante dans Home Assistant.
- **En direct** : mise à jour automatique quand vos appareils, automatisations ou tableaux de bord changent.
- **Dans votre langue** : celle de chaque utilisateur (français et anglais fournis).

### Installation
1. HACS › ⋮ › **Dépôts personnalisés** › ajoutez `https://github.com/babounx/ha-devices-usage-maps`, type **Intégration**.
2. Installez **Devices Usage Maps**, puis redémarrez Home Assistant.
3. **Paramètres › Appareils et services › Ajouter une intégration › Devices Usage Maps**.

### Carte ou page dans la barre latérale
- **Barre latérale** : dans les **options** de l'intégration, activez ou désactivez **Afficher dans la barre latérale** (titre et icône modifiables).
- **Carte** : toujours disponible (Modifier le tableau de bord › Ajouter une carte › **Devices Usage Maps**), sans ressource à ajouter. Pour la pleine page, placez-la dans une vue de type *Panneau*.

Nécessite Home Assistant 2024.12 ou plus récent et un **compte administrateur**.

### Licence
Logiciel libre publié sous [licence GNU GPL v3.0](LICENSE).
