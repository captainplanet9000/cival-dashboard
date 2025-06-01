# Modal Testing Strategy

This document outlines the comprehensive testing approach for the Trading Farm modal system following our standardization efforts.

## 1. Unit Testing Modal Components

### Test Components
- `DialogWrapper` - Test that it correctly passes props to underlying Dialog component
- `ModalController` - Test the context provider and hooks
- Individual modal components (e.g., `TradingTerminalModal`, `ConnectExchangeModal`)

### Key Test Cases
- Modal opens and closes properly
- Props are passed correctly (especially `isOpen`, `onClose`, `onSuccess`)
- Form validation works as expected
- Error states are handled properly
- Callbacks fire with correct parameters

## 2. Integration Testing

### Test Areas
- Modal Controller Provider with actual modal components
- Modal interactions with database operations
- Form submissions and response handling

### Key Test Cases
- Modal controller correctly manages state for multiple modals
- Error boundary catches and displays errors correctly
- Modal controller properly supports all modal types
- Success callbacks execute with correct parameters

## 3. E2E Testing with Cypress

### Test Flows
- Complete user journeys involving modals (e.g., connecting an exchange)
- Modal opening from multiple entry points
- Form submissions and success/error handling
- Modal animations and accessibility

### Key Test Cases
- Modals can be opened from action bar and individual triggers
- Form submissions work end-to-end
- Error states are displayed correctly
- Modals are accessible via keyboard navigation

## 4. Accessibility Testing

### Tools
- axe-core for automated a11y testing
- Manual keyboard navigation testing
- Screen reader compatibility

### Key Test Cases
- Modal traps focus while open
- ESC key closes modals
- Tab order is logical
- Screen readers announce modal content properly

## 5. Performance Testing

### Metrics to Track
- Modal open/close animation performance
- Form submission response times
- Memory usage with multiple modals

### Key Test Cases
- Measure time to open/close modals
- Test with multiple modals in succession
- Monitor memory usage during heavy modal usage

## 6. Implementation Strategy

### Unit Tests (Jest + React Testing Library)

```tsx
// Example unit test for DialogWrapper
test('DialogWrapper passes open/close props correctly', () => {
  const handleOpenChange = jest.fn();
  render(
    <DialogWrapper open={true} onOpenChange={handleOpenChange}>
      <div data-testid="dialog-content">Test Content</div>
    </DialogWrapper>
  );
  
  expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
  
  // Test that clicking outside or pressing escape calls onOpenChange
  fireEvent.keyDown(screen.getByTestId('dialog-content'), { key: 'Escape' });
  expect(handleOpenChange).toHaveBeenCalledWith(false);
});

// Example unit test for modal controller
test('useModal hook shows and hides modals', () => {
  const TestComponent = () => {
    const { showModal, hideModal } = useModal();
    return (
      <>
        <button onClick={() => showModal('tradingTerminal', { symbol: 'BTC/USDT' })}>
          Open Modal
        </button>
        <button onClick={hideModal}>Close Modal</button>
      </>
    );
  };
  
  render(
    <ModalProvider>
      <TestComponent />
    </ModalProvider>
  );
  
  fireEvent.click(screen.getByText('Open Modal'));
  // Verify modal is shown with correct props
});
```

### E2E Tests (Cypress)

```js
// Example Cypress test for ConnectExchangeModal
describe('Connect Exchange Modal', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
    cy.intercept('POST', '/api/exchange-credentials', { 
      statusCode: 200, 
      body: { id: 'test-credential-id' } 
    }).as('saveCredentials');
  });
  
  it('opens from dashboard action bar and submits form', () => {
    // Open modal from action bar
    cy.contains('Connect Exchange').click();
    
    // Fill in form
    cy.get('[data-cy=exchange-select]').click();
    cy.contains('Binance').click();
    cy.get('[data-cy=api-key]').type('test-api-key');
    cy.get('[data-cy=api-secret]').type('test-api-secret');
    
    // Submit form
    cy.contains('Connect').click();
    
    // Wait for API call and check success message
    cy.wait('@saveCredentials');
    cy.contains('Exchange connected successfully');
    
    // Modal should be closed
    cy.get('[role=dialog]').should('not.exist');
  });
});
```

## 7. Testing Schedule

1. **Unit Tests**: Implement with each new modal or modification
2. **Integration Tests**: Run as part of the CI/CD pipeline
3. **E2E Tests**: Run daily on staging environment
4. **Accessibility Tests**: Run weekly and before major releases
5. **Performance Tests**: Run before major releases

## 8. Monitoring & Reporting

- Track modal usage analytics in production
- Monitor error rates for modal operations
- Report on accessibility compliance
- Performance monitoring dashboard
