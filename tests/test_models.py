from api.models import Game, Odds, PlayerProp, Score


def test_model_tablenames():
    assert Game.__tablename__ == "games"
    assert Odds.__tablename__ == "odds"
    assert PlayerProp.__tablename__ == "player_props"
    assert Score.__tablename__ == "scores"


def test_game_has_score_relationship():
    assert hasattr(Game, "score")


def test_score_has_game_relationship():
    assert hasattr(Score, "game")


def test_mlb_player_model():
    from api.models import MlbPlayer
    assert MlbPlayer.__tablename__ == "mlb_players"


def test_mlb_player_game_log_model():
    from api.models import MlbPlayerGameLog
    assert MlbPlayerGameLog.__tablename__ == "mlb_player_game_logs"


def test_player_prop_has_mlb_player_id():
    from api.models import PlayerProp
    assert hasattr(PlayerProp, "mlb_player_id")
