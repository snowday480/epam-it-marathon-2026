using APIHandler.Constants;
using Amazon.CognitoIdentityProvider.Model;
using APIHandler.Constants.Dishes;
using APIHandler.Constants.Orders;
using APIHandler.Entities;
using APIHandler.Exceptions;
using APIHandler.Models.GuestSessions;
using APIHandler.Repositories.Auth;
using APIHandler.Repositories.Dishes;
using APIHandler.Repositories.GroupReservations;
using APIHandler.Repositories.GuestSessions;
using APIHandler.Repositories.Orders;
using APIHandler.Repositories.Reservations;
using APIHandler.Repositories.Tables;
using APIHandler.Services.GuestSessions;
using AutoFixture.Xunit2;
using Moq;
using NPOI.POIFS.Storage;
using System.Security.Cryptography;
using System.Text;

namespace APIHandler.Tests.Services;

public class GuestSessionServiceTests
{
    private readonly Mock<IGuestSessionRepository> _mockGuestSessionRepository = new();
    private readonly Mock<IGroupReservationRepository> _mockGroupReservationRepository = new();
    private readonly Mock<IDishRepository> _mockDishRepository = new();
    private readonly Mock<IReservationRepository> _mockReservationRepository = new();
    private readonly Mock<IUserRepository> _mockUserRepository = new();
    private readonly Mock<ITableRepository> _mockTableRepository = new();
    private readonly Mock<IOrderRepository> _mockOrderRepository = new();
    private readonly GuestSessionService _guestSessionService;

    public GuestSessionServiceTests()
    {
        _guestSessionService = new GuestSessionService(
            _mockGroupReservationRepository.Object,
            _mockGuestSessionRepository.Object,
            _mockDishRepository.Object,
            _mockReservationRepository.Object,
            _mockUserRepository.Object,
            _mockTableRepository.Object,
            _mockOrderRepository.Object);
    }
    [Theory]
    [InlineAutoData(0)]
    [InlineAutoData(3)]
    public async Task CreateGuestSessionAsync_CorrectData_ReturnsSessionToken(
        int guestCount,
        CreateGuestSessionRequest request,
        GroupReservation groupReservation,
        Reservation parentReservation)
    {
        groupReservation.GroupReservationId = request.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;
        groupReservation.ReservationId = parentReservation.Id;

        parentReservation.GuestCount = 5;

        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId))
            .ReturnsAsync(groupReservation);

        _mockReservationRepository
            .Setup(r => r.GetReservationByIdAsync(parentReservation.Id))
            .ReturnsAsync(parentReservation);

        _mockGuestSessionRepository
            .Setup(r => r.GetAllByGroupReservationIdAsync(groupReservation.GroupReservationId))
            .ReturnsAsync([]);

        GuestSession? session = null;
        _mockGuestSessionRepository
            .Setup(r => r.SaveAsync(It.IsAny<GuestSession>()))
            .Callback<GuestSession>(s => session = s);

        _mockGuestSessionRepository
            .Setup(r => r.CountByGroupReservationId(groupReservation.GroupReservationId))
            .ReturnsAsync(guestCount);

        var response = await _guestSessionService.CreateGuestSessionAsync(request);

        Assert.NotEmpty(response.SessionId);
        Assert.NotEmpty(response.SessionToken);
        Assert.NotNull(session);
        Assert.Equal(groupReservation.GroupReservationId, session.GroupReservationId);
        Assert.Equal(request.GuestName, session.GuestName);
        Assert.NotNull(session.SessionTokenHash);
        Assert.NotEmpty(session.SessionTokenHash);
    }

    [Theory]
    [AutoData]
    public async Task CreateGuestSessionAsync_InvalidGroupReservationId_ThrowsGroupReservationNotFoundException(CreateGuestSessionRequest request)
    {
        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(request.GroupReservationId))
            .ReturnsAsync((GroupReservation?)null);

        await Assert.ThrowsAsync<GroupReservationNotFoundException>(() => _guestSessionService.CreateGuestSessionAsync(request));
    }

    [Theory]
    [AutoData]
    public async Task CreateGuestSessionAsync_GroupReservationExpired_ThrowsGroupReservationExpiredException(CreateGuestSessionRequest request, GroupReservation groupReservation)
    {
        groupReservation.GroupReservationId = request.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;

        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(request.GroupReservationId))
            .ReturnsAsync(groupReservation);

        await Assert.ThrowsAsync<GroupReservationExpiredException>(() => _guestSessionService.CreateGuestSessionAsync(request));
    }

    [Theory]
    [AutoData]
    public async Task AddDishAsync_ShouldAddNewDish_WhenDishDoesNotExistInSession(GuestSession guestSession, GroupReservation groupReservation, Reservation parentReservation, Table table, Dish dish)
    {
        guestSession.Dishes = [];
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;

        groupReservation.ReservationId = parentReservation.Id;
        parentReservation.TableId = table.Id;
        dish.State = DishState.Available;
        int quantityToAdd = 2;

        _mockGuestSessionRepository.Setup(r => r.GetByGuestSessionId(guestSession.Id)).ReturnsAsync(guestSession);
        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId)).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync(parentReservation.Id)).ReturnsAsync(parentReservation);
        _mockTableRepository.Setup(r => r.GetTableAsync(table.Id)).ReturnsAsync(table);
        _mockDishRepository.Setup(r => r.GetDishesByLocationIdAsync(table.LocationId)).ReturnsAsync([dish]);

        await _guestSessionService.AddDishAsync(guestSession.Id, dish.Id, quantityToAdd);

        Assert.Single(guestSession.Dishes);
        Assert.Equal(dish.Id, guestSession.Dishes[0].DishId);
        Assert.Equal(quantityToAdd, guestSession.Dishes[0].Quantity);
        Assert.Equal(OrderItemState.Pending, guestSession.Dishes[0].State);

        _mockGuestSessionRepository.Verify(r => r.SaveAsync(guestSession), Times.Once);
    }

    [Theory]
    [AutoData]
    public async Task AddDishAsync_ShouldIncreaseQuantity_WhenDishAlreadyExists(GuestSession guestSession, GroupReservation groupReservation, Reservation parentReservation, Table table, Dish dish)
    {
        int initialQuantity = 3;
        int quantityToAdd = 2;
        guestSession.Dishes = [new OrderItem { DishId = dish.Id, Quantity = initialQuantity, State = OrderItemState.Pending }];
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;

        groupReservation.ReservationId = parentReservation.Id;
        parentReservation.TableId = table.Id;
        dish.State = DishState.Available;

        _mockGuestSessionRepository.Setup(r => r.GetByGuestSessionId(guestSession.Id)).ReturnsAsync(guestSession);
        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId)).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync(parentReservation.Id)).ReturnsAsync(parentReservation);
        _mockTableRepository.Setup(r => r.GetTableAsync(table.Id)).ReturnsAsync(table);
        _mockDishRepository.Setup(r => r.GetDishesByLocationIdAsync(table.LocationId)).ReturnsAsync([dish]);

        await _guestSessionService.AddDishAsync(guestSession.Id, dish.Id, quantityToAdd);

        Assert.Single(guestSession.Dishes);
        Assert.Equal(initialQuantity + quantityToAdd, guestSession.Dishes[0].Quantity);

        _mockGuestSessionRepository.Verify(r => r.SaveAsync(guestSession), Times.Once);
    }

    [Theory]
    [InlineAutoData(0)]
    [InlineAutoData(-1)]
    public async Task AddDishAsync_ShouldThrowValidationException_WhenQuantityIsZeroOrLess(int quantity, string guestSessionId, Dish dish)
    {
        dish.State = DishState.Available;

        _mockDishRepository
            .Setup(r => r.GetDishByIdAsync(dish.Id))
            .ReturnsAsync(dish);

        await Assert.ThrowsAsync<ValidationException>(() =>
            _guestSessionService.AddDishAsync(guestSessionId, dish.Id, quantity));
    }

    [Theory]
    [AutoData]
    public async Task AddDishAsync_ShouldThrowGuestSessionNotFoundException_WhenSessionNotFound(string guestSessionId, Dish dish)
    {
        dish.State = DishState.Available;

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSessionId))
            .ReturnsAsync((GuestSession?)null);

        _mockDishRepository
            .Setup(r => r.GetDishByIdAsync(dish.Id))
            .ReturnsAsync(dish);

        var exception = await Assert.ThrowsAsync<GuestSessionNotFoundException>(() =>
            _guestSessionService.AddDishAsync(guestSessionId, dish.Id, 2));
    }

    [Theory]
    [AutoData]
    public async Task AddDishAsync_ShouldThrowDishNotFound_WhenDishNotFound(GuestSession guestSession, GroupReservation groupReservation, Reservation parentReservation, Table table, string dishId)
    {
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;
        groupReservation.ReservationId = parentReservation.Id;
        parentReservation.TableId = table.Id;

        _mockGuestSessionRepository.Setup(r => r.GetByGuestSessionId(guestSession.Id)).ReturnsAsync(guestSession);
        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId)).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync(parentReservation.Id)).ReturnsAsync(parentReservation);
        _mockTableRepository.Setup(r => r.GetTableAsync(table.Id)).ReturnsAsync(table);

        _mockDishRepository.Setup(r => r.GetDishesByLocationIdAsync(table.LocationId)).ReturnsAsync([]);

        var exception = await Assert.ThrowsAsync<ValidationException>(() =>
            _guestSessionService.AddDishAsync(guestSession.Id, dishId, quantity: 2));
    }

    [Theory]
    [AutoData]
    public async Task AddDishAsync_ShouldThrowDishNotAvailable_WhenDishIsNotAvailable(GuestSession guestSession, GroupReservation groupReservation, Reservation parentReservation, Table table, Dish dish)
    {
        dish.State = DishState.OutOfStock;
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;
        groupReservation.ReservationId = parentReservation.Id;
        parentReservation.TableId = table.Id;

        _mockGuestSessionRepository.Setup(r => r.GetByGuestSessionId(guestSession.Id)).ReturnsAsync(guestSession);
        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId)).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync(parentReservation.Id)).ReturnsAsync(parentReservation);
        _mockTableRepository.Setup(r => r.GetTableAsync(table.Id)).ReturnsAsync(table);
        _mockDishRepository.Setup(r => r.GetDishesByLocationIdAsync(table.LocationId)).ReturnsAsync([dish]);

        var exception = await Assert.ThrowsAsync<DishIsNotAvailableException>(() =>
            _guestSessionService.AddDishAsync(guestSession.Id, dish.Id, quantity: 2));
    }

    [Theory]
    [InlineAutoData(GroupReservationStatus.Submitted, typeof(GroupReservationSubmittedException))]
    [InlineAutoData(GroupReservationStatus.Closed, typeof(GroupReservationExpiredException))]
    public async Task AddDishAsync_ShouldThrowGroupReservationExpired_WhenGroupStatusIsNotOpen(GroupReservationStatus status, Type exceptionType, GuestSession guestSession, GroupReservation groupReservation, Dish dish)
    {
        dish.State = DishState.Available;
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = status;

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSession.Id))
            .ReturnsAsync(guestSession);

        _mockDishRepository
            .Setup(r => r.GetDishByIdAsync(dish.Id))
            .ReturnsAsync(dish);

        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId))
            .ReturnsAsync(groupReservation);

        var exception = await Assert.ThrowsAsync(exceptionType, () =>
            _guestSessionService.AddDishAsync(guestSession.Id, dish.Id, quantity: 2));
    }

    [Theory]
    [AutoData]
    public async Task RemoveDishAsync_ShouldDecreaseQuantity_WhenQuantityIsGreaterThanAmountToRemove(GuestSession guestSession, GroupReservation groupReservation, string dishId)
    {
        int initialQuantity = 5;
        int quantityToRemove = 2;
        guestSession.Dishes =
        [
            new OrderItem { DishId = dishId, Quantity = initialQuantity, State = OrderItemState.Pending }
        ];
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSession.Id))
            .ReturnsAsync(guestSession);


        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId))
            .ReturnsAsync(groupReservation);

        await _guestSessionService.RemoveDishAsync(guestSession.Id, dishId, quantityToRemove);

        Assert.Single(guestSession.Dishes);
        Assert.Equal(initialQuantity - quantityToRemove, guestSession.Dishes[0].Quantity);

        _mockGuestSessionRepository.Verify(r => r.SaveAsync(guestSession), Times.Once);
    }

    [Theory]
    [AutoData]
    public async Task RemoveDishAsync_ShouldRemoveDishFromList_WhenQuantityToRemoveIsEqualOrGreater(GuestSession guestSession, GroupReservation groupReservation, string dishId)
    {
        int initialQuantity = 2;
        int quantityToRemove = 3;
        guestSession.Dishes =
        [
            new OrderItem { DishId = dishId, Quantity = initialQuantity, State = OrderItemState.Pending }
        ];
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSession.Id))
            .ReturnsAsync(guestSession);

        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId))
            .ReturnsAsync(groupReservation);

        await _guestSessionService.RemoveDishAsync(guestSession.Id, dishId, quantityToRemove);

        Assert.Empty(guestSession.Dishes);
        _mockGuestSessionRepository.Verify(r => r.SaveAsync(guestSession), Times.Once);
    }

    [Theory]
    [AutoData]
    public async Task RemoveDishAsync_ShouldThrowDishNotFoundException_WhenDishDoesNotExistInSession(GuestSession guestSession, GroupReservation groupReservation, string dishId)
    {
        guestSession.Dishes = [];
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSession.Id))
            .ReturnsAsync(guestSession);

        _mockGroupReservationRepository
           .Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId))
           .ReturnsAsync(groupReservation);

        var exception = await Assert.ThrowsAsync<DishNotFoundException>(() =>
            _guestSessionService.RemoveDishAsync(guestSession.Id, dishId, 2));

        Assert.Contains("not found in guest session", exception.Message);
    }

    [Theory]
    [AutoData]
    public async Task RemoveDishAsync_ShouldThrowValidationException_WhenQuantityIsZeroOrLess(string guestSessionId, string dishId)
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            _guestSessionService.RemoveDishAsync(guestSessionId, dishId, 0));

        await Assert.ThrowsAsync<ValidationException>(() =>
            _guestSessionService.RemoveDishAsync(guestSessionId, dishId, -5));
    }

    [Theory]
    [AutoData]
    public async Task RemoveDishAsync_ShouldThrowGuestSessionNotFoundException_WhenSessionNotFound(string guestSessionId, string dishId)
    {
        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSessionId))
            .ReturnsAsync((GuestSession?)null);

        var exception = await Assert.ThrowsAsync<GuestSessionNotFoundException>(() =>
            _guestSessionService.RemoveDishAsync(guestSessionId, dishId, 2));
    }
    [Theory]
    [InlineAutoData(1, 0)]
    [InlineAutoData(1, 1)]
    [InlineAutoData(2, 1)]
    [InlineAutoData(2, 2)]
    public async Task CreateGuestSessionAsync_WhenCapacityReached_ThrowsGuestLimitExceededException(
        int reservationCapacity,
        int guestCount,
        CreateGuestSessionRequest request,
        GroupReservation groupReservation,
        Reservation parentReservation)
    {
        groupReservation.Status = GroupReservationStatus.Open;
        groupReservation.GroupReservationId = request.GroupReservationId;
        groupReservation.ReservationId = parentReservation.Id;

        parentReservation.GuestCount = reservationCapacity;

        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId))
            .ReturnsAsync(groupReservation);

        _mockReservationRepository
            .Setup(r => r.GetReservationByIdAsync(parentReservation.Id))
            .ReturnsAsync(parentReservation);

        _mockGuestSessionRepository
            .Setup(r => r.CountByGroupReservationId(groupReservation.GroupReservationId))
            .ReturnsAsync(guestCount);

        var exception = await Assert.ThrowsAsync<GuestLimitExceededException>(() => _guestSessionService.CreateGuestSessionAsync(request));

        _mockGuestSessionRepository.Verify(r => r.SaveAsync(It.IsAny<GuestSession>()), Times.Never);
    }

    [Theory]
    [AutoData]
    public async Task CreateGuestSessionAsync_MissingParentReservation_ThrowsGroupReservationExpiredException(
        CreateGuestSessionRequest request,
        GroupReservation groupReservation)
    {
        groupReservation.GroupReservationId = request.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;

        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId))
            .ReturnsAsync(groupReservation);

        _mockReservationRepository
            .Setup(r => r.GetReservationByIdAsync(groupReservation.ReservationId))
            .ReturnsAsync((Reservation?)null);

        var exception = await Assert.ThrowsAsync<GroupReservationExpiredException>(() => _guestSessionService.CreateGuestSessionAsync(request));
    }

    [Theory]
    [AutoData]
    public async Task IsAuthorizedAsync_ValidTokenAndId_ReturnsTrue(GuestSession guestSession, byte[] tokenBytes)
    {
        string tokenString = Convert.ToBase64String(tokenBytes);
        var hashString = Convert.ToBase64String(SHA256.HashData(tokenBytes));
        guestSession.SessionTokenHash = hashString;

        _mockGuestSessionRepository
            .Setup(r => r.GetByTokenHash(hashString))
            .ReturnsAsync(guestSession);

        bool result = await _guestSessionService.IsAuthorizedAsync(tokenString, guestSession.Id);

        Assert.True(result);
    }

    [Theory]
    [AutoData]
    public async Task IsAuthorizedAsync_InvalidToken_ReturnsFalse(byte[] tokenBytes, string guestSessionId)
    {
        string tokenString = Convert.ToBase64String(tokenBytes);
        var hashString = Convert.ToBase64String(SHA256.HashData(tokenBytes));

        _mockGuestSessionRepository
            .Setup(r => r.GetByTokenHash(hashString))
            .ReturnsAsync((GuestSession?)null);

        bool result = await _guestSessionService.IsAuthorizedAsync(tokenString, guestSessionId);

        Assert.False(result);
    }

    [Theory]
    [AutoData]
    public async Task IsAuthorizedAsync_InvalidGuestSessionId_ReturnsFalse(GuestSession guestSession, byte[] tokenBytes, string guestSessionId)
    {
        string tokenString = Convert.ToBase64String(tokenBytes);
        var hashString = Convert.ToBase64String(SHA256.HashData(tokenBytes));
        guestSession.SessionTokenHash = hashString;

        _mockGuestSessionRepository
            .Setup(r => r.GetByTokenHash(hashString))
            .ReturnsAsync(guestSession);

        bool result = await _guestSessionService.IsAuthorizedAsync(tokenString, guestSessionId);

        Assert.False(result);
    }
    [Theory]
    [AutoData]
    public async Task SubmitCartAsync_Valid_SubmitsSuccessfuilly(GuestSession guestSession, GroupReservation groupReservation, Dish[] dishes)
    {
        foreach (var dish in dishes)
            dish.State = DishState.Available;

        guestSession.IsSubmitted = false;
        guestSession.GroupReservationId = groupReservation.GroupReservationId;

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSession.Id))
            .ReturnsAsync(guestSession);

        _mockGroupReservationRepository
           .Setup(r => r.GetGroupReservationByIdAsync(guestSession.GroupReservationId))
           .ReturnsAsync(groupReservation);

        _mockDishRepository
            .Setup(d => d.GetDishesByIdsAsync(It.IsAny<IEnumerable<string>>()))
            .ReturnsAsync(dishes);

        GuestSession? session = null;
        _mockGuestSessionRepository
            .Setup(r => r.SaveAsync(It.IsAny<GuestSession>()))
            .Callback<GuestSession>(s => session = s);

        await _guestSessionService.SubmitCartAsync(guestSession.Id);

        Assert.NotNull(session);
        Assert.True(session.IsSubmitted);
    }

    [Theory]
    [AutoData]
    public async Task SubmitCartAsync_SessionNotFound_ThrowsGuestSessionNotFound(string guestSessionId)
    {
        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSessionId))
            .ReturnsAsync((GuestSession?)null);

        await Assert.ThrowsAsync<GuestSessionNotFoundException>(() => _guestSessionService.SubmitCartAsync(guestSessionId));
    }

    [Theory]
    [InlineAutoData(GroupReservationStatus.Submitted, typeof(GroupReservationSubmittedException))]
    [InlineAutoData(GroupReservationStatus.Closed, typeof(GroupReservationExpiredException))]
    public async Task SubmitCartAsync_GroupReservationNotOpen_ThrowsException(GroupReservationStatus status, Type exceptionType, GuestSession guestSession, GroupReservation groupReservation)
    {
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = status;

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSession.Id))
            .ReturnsAsync(guestSession);

        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(guestSession.GroupReservationId))
            .ReturnsAsync(groupReservation);

        await Assert.ThrowsAsync(exceptionType, () => _guestSessionService.SubmitCartAsync(guestSession.Id));
    }

    [Theory]
    [AutoData]
    public async Task SubmitCartAsync_GuestSessionHasNoDishes_ThrowsCartIsEmptyException(GuestSession guestSession, GroupReservation groupReservation)
    {
        guestSession.Dishes = [];
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSession.Id))
            .ReturnsAsync(guestSession);

        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(guestSession.GroupReservationId))
            .ReturnsAsync(groupReservation);

        await Assert.ThrowsAsync<CartIsEmptyException>(() => _guestSessionService.SubmitCartAsync(guestSession.Id));
    }

    [Theory]
    [AutoData]
    public async Task SubmitCartAsync_GuestSessionSubmitted_ThrowsAlreadySubmited(GuestSession guestSession, GroupReservation groupReservation)
    {
        guestSession.IsSubmitted = true;
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.Status = GroupReservationStatus.Open;

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSession.Id))
            .ReturnsAsync(guestSession);

        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(guestSession.GroupReservationId))
            .ReturnsAsync(groupReservation);

        await Assert.ThrowsAsync<GuestSessionSubmittedException>(() => _guestSessionService.SubmitCartAsync(guestSession.Id));
    }

    [Theory]
    [InlineAutoData(DishState.OutOfStock)]
    [InlineAutoData(DishState.OnStop)]
    public async Task SubmitCartAsync_DishNotAvailable_ThrowsDishNotAvailable(DishState state, Dish dish, GuestSession guestSession, GroupReservation groupReservation)
    {
        dish.State = state;
        guestSession.IsSubmitted = false;
        guestSession.GroupReservationId = groupReservation.GroupReservationId;
        guestSession.Dishes = 
        [
            new OrderItem()
            {
                DishId = dish.Id,
                Quantity = 1,
            }
        ];

        _mockDishRepository
            .Setup(d => d.GetDishesByIdsAsync(It.IsAny<IEnumerable<string>>()))
            .ReturnsAsync([dish]);

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(guestSession.Id))
            .ReturnsAsync(guestSession);

        _mockGroupReservationRepository
           .Setup(r => r.GetGroupReservationByIdAsync(guestSession.GroupReservationId))
           .ReturnsAsync(groupReservation);

        await Assert.ThrowsAsync<DishIsNotAvailableException>(() => _guestSessionService.SubmitCartAsync(guestSession.Id));
    }
    [Theory]
    [MemberAutoData(nameof(PepareDishesForGuestSession))]
    public async Task GetGuestSessionInfoAsync_Guest_ReturnsAsync(
        IEnumerable<string> dishIds,
        IEnumerable<Dish> dishes,
        List<OrderItem> orderItems,
        decimal expectedTotal,
        GuestSession session)
    {
        session.Dishes = orderItems;
        session.IsOwnerSession = false;

        _mockDishRepository
            .Setup(r => r.GetDishesByIdsAsync(dishIds))
            .ReturnsAsync(dishes);

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(session.Id))
            .ReturnsAsync(session);

        GetGuestSessionResponse result = await _guestSessionService.GetGuestSessionInfoAsync(session.Id);

        Assert.Equal(session.GuestName, result.Name);
        Assert.Equal(dishes.Count(), result.Items.Count());
        Assert.Equal(expectedTotal, result.Total);
    }

    [Theory]
    [MemberAutoData(nameof(PepareDishesForGuestSession))]
    public async Task GetGuestSessionInfoAsync_GroupOwner_ReturnsAsync(
        IEnumerable<string> dishIds,
        IEnumerable<Dish> dishes,
        List<OrderItem> orderItems,
        decimal expectedTotal,
        GuestSession session,
        GroupReservation groupReservation,
        Reservation reservation,
        string customerId,
        string ownerName,
        UserType userType)
    {
        session.Dishes = orderItems;
        session.IsOwnerSession = true;
        session.GroupReservationId = groupReservation.GroupReservationId;
        groupReservation.ReservationId = reservation.Id;
        reservation.CustomerId = customerId;
        userType.Attributes.Add(new AttributeType()
        {
            Name = "given_name",
            Value = ownerName,
        });

        _mockDishRepository
            .Setup(r => r.GetDishesByIdsAsync(dishIds))
            .ReturnsAsync(dishes);

        _mockGuestSessionRepository
            .Setup(r => r.GetByGuestSessionId(session.Id))
            .ReturnsAsync(session);

        _mockGroupReservationRepository
            .Setup(r => r.GetGroupReservationByIdAsync(groupReservation.GroupReservationId))
            .ReturnsAsync(groupReservation);

        _mockReservationRepository
            .Setup(r => r.GetReservationByIdAsync(reservation.Id))
            .ReturnsAsync(reservation);

        _mockUserRepository
            .Setup(r => r.GetUserByIdAsync(customerId))
            .ReturnsAsync(userType);

        GetGuestSessionResponse result = await _guestSessionService.GetGuestSessionInfoAsync(session.Id);

        Assert.Equal(ownerName, result.Name);
        Assert.Equal(dishes.Count(), result.Items.Count());
        Assert.Equal(expectedTotal, result.Total);
    }

    public static TheoryData<IEnumerable<string>, IEnumerable<Dish>, List<OrderItem>, decimal> PepareDishesForGuestSession()
    {
        var dishMap = new Dictionary<string, Dish>()
        {
            ["1"] = new()
            {
                Id = "1",
                Price = 1
            },
            ["2"] = new()
            {
                Id = "2",
                Price = 2
            },
            ["3"] = new()
            {
                Id = "3",
                Price = 3
            }
        };

        var orderItems = new List<OrderItem>
        {
            new OrderItem()
                    {
                        DishId = "1",
                        Quantity = 2
                    },
                    new OrderItem()
                    {
                        DishId = "2",
                        Quantity = 3
                    },
                    new OrderItem()
                    {
                        DishId = "3",
                        Quantity = 1
                    }
        };

        var expectedTotal = orderItems.Sum(o => dishMap[o.DishId].Price * o.Quantity);

        return new()
        {
            { dishMap.Keys, dishMap.Values, orderItems, expectedTotal }
        };
    }
    [Fact]
    public async Task GetAllSessionsAsync_WhenNotOwner_ThrowsActionForbiddenException()
    {
        var groupReservation = new GroupReservation { GroupReservationId = "grp-1", ReservationId = "res-1", ReservationToken = "tok-1", Status = GroupReservationStatus.Open };
        var reservation = new Reservation { Id = "res-1", CustomerId = "owner-user", TableId = "tbl-1", WaiterId = "waiter-1", GuestCount = 4, Status = ReservationStatus.Reserved };

        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync("grp-1")).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync("res-1")).ReturnsAsync(reservation);

        await Assert.ThrowsAsync<ActionForbiddenException>(() => _guestSessionService.GetAllSessionsAsync("other-user", "grp-1"));
    }

    [Fact]
    public async Task GetAllSessionsAsync_WhenValidOwner_ReturnsAllParticipantsAndTotal()
    {
        var groupReservation = new GroupReservation { GroupReservationId = "grp-1", ReservationId = "res-1", ReservationToken = "tok-1", Status = GroupReservationStatus.Open };
        var reservation = new Reservation { Id = "res-1", CustomerId = "owner-user", TableId = "tbl-1", WaiterId = "waiter-1", GuestCount = 4, Status = ReservationStatus.Reserved };
        var dishes = new List<Dish>
        {
            new Dish { Id = "d1", Name = "Dish 1", Price = 100, Description = "desc", Weight = "100", Calories = "100", Proteins = "1", Fats = "1", Carbohydrates = "1", Vitamins = "A", State = DishState.Available, DishType = DishType.MainCourse },
            new Dish { Id = "d2", Name = "Dish 2", Price = 50, Description = "desc", Weight = "100", Calories = "100", Proteins = "1", Fats = "1", Carbohydrates = "1", Vitamins = "A", State = DishState.Available, DishType = DishType.Appetizer }
        };
        var sessions = new List<GuestSession>
        {
            new GuestSession
            {
                Id = "s1",
                GroupReservationId = "grp-1",
                GuestName = "Owner",
                IsOwnerSession = true,
                OwnerUserId = "owner-user",
                IsSubmitted = true,
                Dishes = [ new OrderItem { DishId = "d1", Quantity = 2 } ]
            },
            new GuestSession
            {
                Id = "s2",
                GroupReservationId = "grp-1",
                GuestName = "Guest 1",
                IsOwnerSession = false,
                IsSubmitted = false,
                Dishes = [ new OrderItem { DishId = "d2", Quantity = 1 } ]
            }
        };

        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync("grp-1")).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync("res-1")).ReturnsAsync(reservation);
        _mockGuestSessionRepository.Setup(r => r.GetAllByGroupReservationIdAsync("grp-1")).ReturnsAsync(sessions);
        _mockDishRepository.Setup(r => r.GetDishesByIdsAsync(It.IsAny<IEnumerable<string>>())).ReturnsAsync(dishes);
        _mockUserRepository.Setup(r => r.GetUserByIdAsync("owner-user")).ReturnsAsync(new UserType
        {
            Attributes = [new AttributeType { Name = "given_name", Value = "John" }]
        });

        var result = await _guestSessionService.GetAllSessionsAsync("owner-user", "grp-1");

        Assert.Equal(250, result.Total);
        var participants = result.Participants.ToList();
        Assert.Equal(2, participants.Count);

        var p1 = participants.First(p => p.Id == "s1");
        Assert.Equal(ParticipantType.Owner, p1.Type);
        Assert.Equal("John", p1.Name);
        Assert.Equal(200, p1.Total);
        Assert.True(p1.IsSubmitted);

        var p2 = participants.First(p => p.Id == "s2");
        Assert.Equal(ParticipantType.Guest, p2.Type);
        Assert.Equal("Guest 1", p2.Name);
        Assert.Equal(50, p2.Total);
        Assert.False(p2.IsSubmitted);
    }

    [Fact]
    public async Task GetOwnerGuestSessionIdAsync_WhenOwnerSessionExists_ReturnsSessionId()
    {
        var reservation = new Reservation { Id = "res-1", CustomerId = "owner-user", TableId = "tbl-1", WaiterId = "waiter-1", GuestCount = 4, Status = ReservationStatus.Reserved };
        var groupReservation = new GroupReservation { GroupReservationId = "grp-1", ReservationId = "res-1", ReservationToken = "tok-1", Status = GroupReservationStatus.Open };
        var existingOwnerSession = new GuestSession
        {
            Id = "existing-owner-session",
            GroupReservationId = "grp-1",
            GuestName = "Owner",
            IsOwnerSession = true,
            OwnerUserId = "owner-user",
            Dishes = []
        };

        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync("res-1")).ReturnsAsync(reservation);
        _mockGroupReservationRepository.Setup(r => r.GetByReservationIdAsync("res-1")).ReturnsAsync(groupReservation);
        _mockGuestSessionRepository.Setup(r => r.GetAllByGroupReservationIdAsync("grp-1")).ReturnsAsync([existingOwnerSession]);

        var result = await _guestSessionService.GetOwnerGuestSessionIdAsync("owner-user", "res-1");

        Assert.Equal("existing-owner-session", result.GuestSessionId);
    }

    [Fact]
    public async Task GetOwnerGuestSessionIdAsync_WhenOwnerSessionDoesNotExist_CreatesAndReturnsSessionId()
    {
        var reservation = new Reservation { Id = "res-1", CustomerId = "owner-user", TableId = "tbl-1", WaiterId = "waiter-1", GuestCount = 4, Status = ReservationStatus.Reserved };
        var groupReservation = new GroupReservation { GroupReservationId = "grp-1", ReservationId = "res-1", ReservationToken = "tok-1", Status = GroupReservationStatus.Open };

        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync("res-1")).ReturnsAsync(reservation);
        _mockGroupReservationRepository.Setup(r => r.GetByReservationIdAsync("res-1")).ReturnsAsync(groupReservation);
        _mockGuestSessionRepository.Setup(r => r.GetAllByGroupReservationIdAsync("grp-1")).ReturnsAsync([]);
        _mockUserRepository.Setup(r => r.GetUserByIdAsync("owner-user")).ReturnsAsync(new UserType
        {
            Attributes = [new AttributeType { Name = "given_name", Value = "Alice" }]
        });

        GuestSession? savedSession = null;
        _mockGuestSessionRepository.Setup(r => r.SaveAsync(It.IsAny<GuestSession>()))
            .Callback<GuestSession>(s => savedSession = s)
            .Returns(Task.CompletedTask);

        var result = await _guestSessionService.GetOwnerGuestSessionIdAsync("owner-user", "res-1");

        Assert.NotNull(savedSession);
        Assert.Equal(result.GuestSessionId, savedSession.Id);
        Assert.True(savedSession.IsOwnerSession);
        Assert.Equal("Alice", savedSession.GuestName);
        Assert.Equal("owner-user", savedSession.OwnerUserId);
    }

    [Fact]
    public async Task SubmitGroupPreOrderAsync_WhenNoSubmittedSessions_ThrowsValidationException()
    {
        var groupReservation = new GroupReservation { GroupReservationId = "grp-1", ReservationId = "res-1", ReservationToken = "tok-1", Status = GroupReservationStatus.Open };
        var reservation = new Reservation { Id = "res-1", CustomerId = "owner-user", TableId = "tbl-1", WaiterId = "waiter-1", GuestCount = 4, Status = ReservationStatus.Reserved };
        var order = new Order { OrderId = "ord-1", CustomerId = "owner-user", ReservationId = "res-1", ReservationAddress = "addr", ReservationTime = "time", Dishes = [], Status = OrderStatus.Created };

        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync("grp-1")).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync("res-1")).ReturnsAsync(reservation);
        _mockOrderRepository.Setup(r => r.GetOrderByReservationIdAsync("res-1")).ReturnsAsync(order);
        _mockGuestSessionRepository.Setup(r => r.GetAllByGroupReservationIdAsync("grp-1")).ReturnsAsync([
            new GuestSession { Id = "s1", GroupReservationId = "grp-1", GuestName = "Guest", IsSubmitted = false, Dishes = [new OrderItem { DishId = "d1", Quantity = 1 }] }
        ]);

        await Assert.ThrowsAsync<ValidationException>(() => _guestSessionService.SubmitGroupPreOrderAsync("owner-user", "grp-1", "res-1"));
    }

    [Fact]
    public async Task SubmitGroupPreOrderAsync_WhenOrderNotFound_ThrowsValidationException()
    {
        var groupReservation = new GroupReservation { GroupReservationId = "grp-1", ReservationId = "res-1", ReservationToken = "tok-1", Status = GroupReservationStatus.Open };
        var reservation = new Reservation { Id = "res-1", CustomerId = "owner-user", TableId = "tbl-1", WaiterId = "waiter-1", GuestCount = 4, Status = ReservationStatus.Reserved };

        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync("grp-1")).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync("res-1")).ReturnsAsync(reservation);
        _mockOrderRepository.Setup(r => r.GetOrderByReservationIdAsync("res-1")).ReturnsAsync((Order?)null);

        await Assert.ThrowsAsync<ValidationException>(() => _guestSessionService.SubmitGroupPreOrderAsync("owner-user", "grp-1", "res-1"));
    }

    [Fact]
    public async Task SubmitGroupPreOrderAsync_WhenValid_ConsolidatesDishesAndUpdatesStatus()
    {
        var groupReservation = new GroupReservation { GroupReservationId = "grp-1", ReservationId = "res-1", ReservationToken = "tok-1", Status = GroupReservationStatus.Open };
        var reservation = new Reservation { Id = "res-1", CustomerId = "owner-user", TableId = "tbl-1", WaiterId = "waiter-1", GuestCount = 4, Status = ReservationStatus.Reserved };
        var order = new Order { OrderId = "ord-1", CustomerId = "owner-user", ReservationId = "res-1", ReservationAddress = "addr", ReservationTime = "time", Dishes = [], Status = OrderStatus.Created };
        var sessions = new List<GuestSession>
        {
            new GuestSession
            {
                Id = "s1",
                GroupReservationId = "grp-1",
                GuestName = "Guest 1",
                IsSubmitted = true,
                Dishes =
                [
                    new OrderItem { DishId = "d1", Quantity = 2 },
                    new OrderItem { DishId = "d2", Quantity = 1 }
                ]
            },
            new GuestSession
            {
                Id = "s2",
                GroupReservationId = "grp-1",
                GuestName = "Guest 2",
                IsSubmitted = true,
                Dishes =
                [
                    new OrderItem { DishId = "d1", Quantity = 3 },
                    new OrderItem { DishId = "d3", Quantity = 4 }
                ]
            },
            new GuestSession
            {
                Id = "s3",
                GroupReservationId = "grp-1",
                GuestName = "Guest 3 (unsubmitted)",
                IsSubmitted = false,
                Dishes =
                [
                    new OrderItem { DishId = "d2", Quantity = 10 }
                ]
            }
        };

        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync("grp-1")).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync("res-1")).ReturnsAsync(reservation);
        _mockOrderRepository.Setup(r => r.GetOrderByReservationIdAsync("res-1")).ReturnsAsync(order);
        _mockGuestSessionRepository.Setup(r => r.GetAllByGroupReservationIdAsync("grp-1")).ReturnsAsync(sessions);

        var result = await _guestSessionService.SubmitGroupPreOrderAsync("owner-user", "grp-1", "res-1");

        Assert.Equal(3, result.Count);
        var d1 = result.First(d => d.DishId == "d1");
        var d2 = result.First(d => d.DishId == "d2");
        var d3 = result.First(d => d.DishId == "d3");

        Assert.Equal(5, d1.Quantity);
        Assert.Equal(1, d2.Quantity);
        Assert.Equal(4, d3.Quantity);

        Assert.Equal(OrderStatus.SubmittedByCustomer, order.Status);
        Assert.Equal(3, order.Dishes.Count);
        Assert.Equal(GroupReservationStatus.Submitted, groupReservation.Status);

        _mockOrderRepository.Verify(r => r.SaveOrderAsync(order), Times.Once);
        _mockGroupReservationRepository.Verify(r => r.SaveGroupReservationAsync(groupReservation), Times.Once);
    }

    [Fact]
    public async Task DeleteGuestSessionAsync_WhenSessionNotInGroup_ThrowsValidationException()
    {
        var groupReservation = new GroupReservation { GroupReservationId = "grp-1", ReservationId = "res-1", ReservationToken = "tok-1", Status = GroupReservationStatus.Open };
        var reservation = new Reservation { Id = "res-1", CustomerId = "owner-user", TableId = "tbl-1", WaiterId = "waiter-1", GuestCount = 4, Status = ReservationStatus.Reserved };
        var session = new GuestSession { Id = "s1", GroupReservationId = "other-group", GuestName = "Guest", Dishes = [] };

        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync("grp-1")).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync("res-1")).ReturnsAsync(reservation);
        _mockGuestSessionRepository.Setup(r => r.GetByGuestSessionId("s1")).ReturnsAsync(session);

        await Assert.ThrowsAsync<ValidationException>(() => _guestSessionService.DeleteGuestSessionAsync("owner-user", "grp-1", "s1"));
    }

    [Fact]
    public async Task DeleteGuestSessionAsync_WhenValid_DeletesSessionAndReturnsUpdatedSnapshot()
    {
        var groupReservation = new GroupReservation { GroupReservationId = "grp-1", ReservationId = "res-1", ReservationToken = "tok-1", Status = GroupReservationStatus.Open };
        var reservation = new Reservation { Id = "res-1", CustomerId = "owner-user", TableId = "tbl-1", WaiterId = "waiter-1", GuestCount = 4, Status = ReservationStatus.Reserved };
        var sessionToDelete = new GuestSession { Id = "s-del", GroupReservationId = "grp-1", GuestName = "Guest Del", Dishes = [] };
        var remainingSession = new GuestSession { Id = "s-remain", GroupReservationId = "grp-1", GuestName = "Guest Remain", Dishes = [] };

        _mockGroupReservationRepository.Setup(r => r.GetGroupReservationByIdAsync("grp-1")).ReturnsAsync(groupReservation);
        _mockReservationRepository.Setup(r => r.GetReservationByIdAsync("res-1")).ReturnsAsync(reservation);
        _mockGuestSessionRepository.Setup(r => r.GetByGuestSessionId("s-del")).ReturnsAsync(sessionToDelete);
        _mockGuestSessionRepository.Setup(r => r.GetAllByGroupReservationIdAsync("grp-1")).ReturnsAsync([remainingSession]);
        _mockDishRepository.Setup(r => r.GetDishesByIdsAsync(It.IsAny<IEnumerable<string>>())).ReturnsAsync([]);

        var result = await _guestSessionService.DeleteGuestSessionAsync("owner-user", "grp-1", "s-del");

        _mockGuestSessionRepository.Verify(r => r.DeleteAsync(sessionToDelete), Times.Once);
        Assert.Single(result.Participants);
        Assert.Equal("s-remain", result.Participants.First().Id);
    }
}