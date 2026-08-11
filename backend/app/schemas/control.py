from datetime import date, time, datetime
from typing import Optional, List, Literal, Any

from pydantic import BaseModel, Field, ConfigDict, field_validator


# ------------------------
# CONSTANTE
# ------------------------

ALLOWED_CONTROL_TYPES = [
    "fond",
    "tematic",
    "operativ",
    "sesizare",
    "rutina",
    "solicitare",
    "necunoscut",
]

ALLOWED_RESULTS = [
    "conform",
    "neconform",
    "avertisment",
    "sanctiune",
    "sesizare_penala",
    "mixt",
    "necunoscut",
]

ALLOWED_ENTITY_TYPES = [
    "ocol silvic",
    "operator economic",
    "primarie",
    "persoana fizica",
    "gestionar fond cinegetic",
]

ALLOWED_MOD_DESFASURARE = [
    "control de fond",
    "control tematic",
    "control operativ",
    "control mixt",
]


# ------------------------
# TIPURI
# ------------------------

JudetType = Literal[
    "Alba", "Arad", "Arges", "Bacau", "Bihor", "Bistrita-Nasaud", "Botosani",
    "Brasov", "Braila", "Buzau", "Caras-Severin", "Calarasi", "Cluj", "Constanta",
    "Covasna", "Dambovita", "Dolj", "Galati", "Giurgiu", "Gorj", "Harghita",
    "Hunedoara", "Ialomita", "Iasi", "Ilfov", "Maramures", "Mehedinti",
    "Mures", "Neamt", "Olt", "Prahova", "Satu Mare", "Salaj", "Sibiu",
    "Suceava", "Teleorman", "Timis", "Tulcea", "Vaslui", "Valcea", "Vrancea", "Bucuresti"
]

GardaType = Literal[
    "GF Brasov",
    "GF Bucuresti",
    "GF Cluj",
    "GF Focsani",
    "GF Oradea",
    "GF Ploiesti",
    "GF Ramnicu Valcea",
    "GF Suceava",
    "GF Timisoara",
]


# ------------------------
# SUBMODELE
# ------------------------

class GPSData(BaseModel):
    lat: float
    lon: float

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, v: float) -> float:
        if v < -90 or v > 90:
            raise ValueError("Latitudine invalida")
        return v

    @field_validator("lon")
    @classmethod
    def validate_lon(cls, v: float) -> float:
        if v < -180 or v > 180:
            raise ValueError("Longitudine invalida")
        return v


class EchipaMember(BaseModel):
    nume: str = Field(..., min_length=2, max_length=100)
    email: Optional[str] = None


class DomeniuDetalii(BaseModel):
    tip: Literal["silvic", "cinegetic"]
    subtipuri: List[str] = Field(default_factory=list)
    fond_numar: Optional[str] = None
    fond_denumire: Optional[str] = None


# ------------------------
# PAYLOAD PRINCIPAL
# ------------------------

class ControlPayload(BaseModel):
    # 1. DATE GENERALE
    data_control: date
    ora_control: Optional[time] = None

    judet: JudetType
    garda: GardaType

    # 2. LOCATIE
    localitate: str = Field(..., min_length=2, max_length=100)
    reper: Optional[str] = Field(None, max_length=300)
    gps: GPSData

    # 3. ECHIPA
    echipa: List[EchipaMember] = Field(default_factory=list)

    # 4. ENTITATE CONTROLATA
    entitate_controlata: str = Field(..., min_length=2, max_length=200)
    tip_entitate: str
    cui: Optional[str] = Field(None, max_length=50)
    sediu: Optional[str] = Field(None, max_length=300)

    reprezentant_nume: Optional[str] = Field(None, max_length=150)
    reprezentant_calitate: Optional[str] = Field(None, max_length=150)

    # 5. DESFASURARE
    mod_desfasurare: str
    parteneri: List[str] = Field(default_factory=list)
    initiator: Optional[str] = Field(None, max_length=150)

    # 5.1 SESIZARE / PETITIE
    este_sesizare: bool = False
    numar_sesizare: Optional[str] = Field(None, max_length=150)
    data_sesizare: Optional[date] = None
    nume_petitionar: Optional[str] = Field(None, max_length=200)
    obiect_sesizare: Optional[str] = Field(None, max_length=5000)

    # 6. DOMENIU
    domeniu: Optional[Literal["silvic", "cinegetic"]] = None
    domeniu_detalii: Optional[DomeniuDetalii] = None
    domeniu_control: Optional[str] = Field(None, max_length=100)
    categorie_control: Optional[str] = Field(None, max_length=300)

    # 7. CONSTATARI
    constatari: Optional[str] = Field(None, min_length=2, max_length=5000)
    constatari_publice: Optional[str] = Field(None, max_length=3000)
    descriere_abatere: Optional[str] = Field(None, max_length=5000)

    # 8. SANCTIUNI / MASURI
    act_normativ: Optional[str] = Field(None, max_length=200)
    articol: Optional[str] = Field(None, max_length=100)

    amenda: Optional[float] = None
    prejudiciu: Optional[float] = None
    cuantum_amenda_ron: Optional[float] = None
    valoare_prejudiciu_ron: Optional[float] = None

    confiscari: Optional[str] = Field(None, max_length=2000)
    masuri_complementare: List[str] = Field(default_factory=list)
    masuri_dispuse: Optional[str] = Field(None, max_length=2000)
    masuri_publice: Optional[str] = Field(None, max_length=3000)

    # Structuri detaliate ale formularului juridic si silvic.
    legal: Optional[dict[str, Any]] = None
    prejudiciu_silvic: Optional[dict[str, Any]] = None
    confiscari_silvic: Optional[dict[str, Any]] = None
    masuri_complementare_extinse: Optional[dict[str, Any]] = None

    # 9. DOCUMENTE
    documente: List[str] = Field(default_factory=list)

    # ------------------------
    # VALIDARI
    # ------------------------

    @field_validator("tip_entitate")
    @classmethod
    def validate_tip_entitate(cls, v: str) -> str:
        if v not in ALLOWED_ENTITY_TYPES:
            raise ValueError(f"tip_entitate invalid. Valori permise: {ALLOWED_ENTITY_TYPES}")
        return v

    @field_validator("mod_desfasurare")
    @classmethod
    def validate_mod_desfasurare(cls, v: str) -> str:
        if v not in ALLOWED_MOD_DESFASURARE:
            raise ValueError(
                f"mod_desfasurare invalid. Valori permise: {ALLOWED_MOD_DESFASURARE}"
            )
        return v

    @field_validator(
        "amenda",
        "prejudiciu",
        "cuantum_amenda_ron",
        "valoare_prejudiciu_ron",
    )
    @classmethod
    def validate_non_negative_amounts(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Valoarea nu poate fi negativa")
        return v

    @field_validator("echipa")
    @classmethod
    def validate_echipa_not_empty(cls, v: List[EchipaMember]) -> List[EchipaMember]:
        if len(v) == 0:
            raise ValueError("Echipa trebuie sa contina cel putin un membru.")
        return v


# ------------------------
# SCHEME REQUEST / RESPONSE
# ------------------------

class ControlCreate(BaseModel):
    result: str = "conform"
    control_type: str = "tematic"
    payload: ControlPayload

    @field_validator("result")
    @classmethod
    def validate_result(cls, v: str) -> str:
        if v not in ALLOWED_RESULTS:
            raise ValueError(f"result invalid. Valori permise: {ALLOWED_RESULTS}")
        return v

    @field_validator("control_type")
    @classmethod
    def validate_control_type(cls, v: str) -> str:
        if v not in ALLOWED_CONTROL_TYPES:
            raise ValueError(
                f"control_type invalid. Valori permise: {ALLOWED_CONTROL_TYPES}"
            )
        return v


class ControlOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    created_by_user_id: int
    result: str
    control_type: str
    # Datele istorice/importate pot avea campuri lipsa, pastrand in acelasi
    # timp validarea stricta ControlPayload pentru creare si actualizare.
    payload: dict[str, Any]
class ControlUpdate(BaseModel):
    result: Optional[str] = None
    control_type: Optional[str] = None
    payload: Optional[ControlPayload] = None

    @field_validator("result")
    @classmethod
    def validate_result(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ALLOWED_RESULTS:
            raise ValueError(f"result invalid. Valori permise: {ALLOWED_RESULTS}")
        return v

    @field_validator("control_type")
    @classmethod
    def validate_control_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ALLOWED_CONTROL_TYPES:
            raise ValueError(
                f"control_type invalid. Valori permise: {ALLOWED_CONTROL_TYPES}"
            )
        return v
