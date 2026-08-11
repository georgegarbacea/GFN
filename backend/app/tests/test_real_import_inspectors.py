import unittest

from app.scripts.import_real_controls import (
    build_inspector_candidates,
    split_inspectors,
)


class InspectorParsingTests(unittest.TestCase):
    def setUp(self):
        self.values = [
            "Vlonga Radu",
            "Toth Szabolcs",
            "Kovacs Istvan",
            "Telean Daniel",
            "Dancila Constantin",
            "Ureche Dragos",
            "Turtoi Nicu-Florin",
            "CMS Lica Paul - IPJ Valcea",
            "FLORISTEAN",
            "FLORISTEAN",
        ]
        self.candidates = build_inspector_candidates(self.values)

    def names(self, raw):
        team, _ = split_inspectors(raw, self.candidates)
        return [member["nume"] for member in team]

    def test_splits_large_space_separated_team(self):
        raw = (
            "Vlonga Radu                                  "
            "Toth Szabolcs                            "
            "Kovacs Istvan                           "
            "Telean Daniel"
        )
        self.assertEqual(
            self.names(raw),
            ["Vlonga Radu", "Toth Szabolcs", "Kovacs Istvan", "Telean Daniel"],
        )

    def test_splits_known_names_without_delimiter(self):
        self.assertEqual(
            self.names("Dancila Constantin Ureche Dragos"),
            ["Dancila Constantin", "Ureche Dragos"],
        )

    def test_keeps_repeated_surname_as_one_person(self):
        self.assertEqual(self.names("FLORISTEAN"), ["Floristean"])

    def test_excludes_explicit_ipj_partner(self):
        raw = "Turtoi Nicu-Florin             CMS Lica Paul - IPJ Valcea"
        self.assertEqual(self.names(raw), ["Turtoi Nicu-florin"])

    def test_rejects_findings_pasted_into_inspector_column(self):
        raw = "S-a dispus materializarea in teren a bornei amenajistice 280."
        self.assertEqual(self.names(raw), [])

    def test_rejects_institution_labels_and_job_fragments(self):
        candidates = build_inspector_candidates(
            ["GF Brasov"] * 10 + ["DS Mures"] * 10 + ["lucrator"] * 10
        )
        team, _ = split_inspectors("GF Brasov, DS Mures, lucrator", candidates)
        self.assertEqual(team, [])


if __name__ == "__main__":
    unittest.main()
