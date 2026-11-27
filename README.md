# Understat team statistics — 3 leagues, 2014/15 to 2024/25

Club-season and match-level Understat statistics for the Premier League (England), La Liga
(Spain) and Serie A (Italy), assembled for a study of playing-style profiles.

The values are Understat's own published numbers. This repository does not add a licence over
them; see **Rights** below.

## Layout

```
raw/         31 archived Understat league pages as JSON (one per league-season)
             Serie_A_season.csv                       match-level dump for the two seasons
                                                      with no complete archive
             understat_teams_aggregated_2014_2024.csv  published aggregate, used only to
                                                      cross-check the reconstruction
processed/   club_season.csv    660 rows x 28 columns   <- start here
             team_match.csv     25,080 rows, one per team per match
             quality_report.json  row counts, coverage, revision, SHA-256
```

## How to load it

No account and no token are needed.

```python
import pandas as pd

URL = "https://huggingface.co/datasets/ganendraditya/understat-data/resolve/main"
club = pd.read_csv(f"{URL}/processed/club_season.csv")
match = pd.read_csv(f"{URL}/processed/team_match.csv")
```

## Provenance

| Part | Source |
|---|---|
| 31 league-seasons | Wayback Machine snapshots of `understat.com/league/<league>/<season>`. Each JSON file records its snapshot timestamp and both the archive and original URL in `_meta`. Snapshot dates run from 18 January 2021 to 23 November 2025. |
| 2 league-seasons (Serie A 2014/15, 2022/23) | `Serie_A/season.csv` from the public `understat-database` Kaggle dump, dated 7 October 2024. No complete archive of those two pages exists: the only snapshot of 2014/15 is a maintenance page, and the latest for 2022/23 was taken with 27 of 38 matches played. |
| `understat_teams_aggregated_2014_2024.csv` | Third-party aggregate used only for cross-checking. It reproduces our reconstruction on 24 of 26 comparable columns across all 660 club-seasons. |

Data were retrieved on 17 November 2026, when `understat.com` was unreachable.

## Aggregation

No column is a mean or a median.

| Columns | Rule |
|---|---|
| xG, xGA, npxG, npxGA, deep, deep_allowed, goals for, goals against, points, expected points | season sum |
| matches, wins, draws, losses | count |
| pressing ratio (`ppda_coef`), opponent pressing ratio (`oppda_coef`) | sum of numerators ÷ sum of denominators |
| goal and expected-goal differences | difference of two aggregated columns |
| league position | rank by points, descending |

`ppda_mean_ratio` and `oppda_mean_ratio` give the per-match-average alternative. The two
definitions differ by a median of 0.82 and a maximum of 7.75 on this dataset, so state which one
an analysis uses.

Two cautions. Understat publishes no operational definition for "deep completions", so `deep` and
`deep_allowed` are treated as penetration indicators. `position` follows the source convention:
clubs tied on points are ordered by first appearance, not by the official tie-break rules.

## Verification

- Re-aggregating the 25,080 match records reproduces the published aggregate exactly on 24 of 26
  comparable columns. The exceptions, `xpts` and `xpts_diff`, differ in two rows by at most 0.019,
  consistent with a provider model update between retrieval dates.
- Against a separate Zenodo deposit (`10.5281/zenodo.10981974`), 10,640 overlapping team-match
  records agree exactly on xG, deep completions and goals.
- For the two seasons without an archive, three independent scrapes agree on 760 of 760 matches
  and all 12 fields (2014/15); two agree on the same basis (2022/23).

## Rights

Understat publishes no explicit licence, and this repository asserts none. The data are shared
for research and verification, with attribution to Understat (<https://understat.com>) as the
original source. If you hold rights to this material and want it removed, open an issue here or
contact the repository owner and it will be taken down.

## Citation

Cite Understat as the data source. A DOI for this deposit will be added here if one is minted.
