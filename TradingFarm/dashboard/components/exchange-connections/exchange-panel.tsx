import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Flex, 
  Text, 
  Badge, 
  Button, 
  IconButton, 
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  FormHelperText,
  Switch,
  Select,
  Tooltip,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { 
  AddIcon, 
  DeleteIcon, 
  EditIcon, 
  RepeatIcon, 
  LockIcon, 
  UnlockIcon,
  InfoIcon,
  WarningIcon,
  CheckCircleIcon,
  ChevronDownIcon
} from '@chakra-ui/icons';
import { motion } from 'framer-motion';

// APIs & Services
import { fetchExchangeStatus, addExchange, updateExchange, deleteExchange, testConnection } from '../../services/exchange-service';

// Helper Components
const AnimatedBox = motion(Box);

// Status Badge Component
const StatusBadge = ({ isConnected }: { isConnected: boolean }) => (
  <Badge 
    colorScheme={isConnected ? 'green' : 'red'} 
    display="flex" 
    alignItems="center" 
    justifyContent="center"
    px={2}
    py={1}
    borderRadius="full"
  >
    {isConnected ? (
      <>
        <CheckCircleIcon mr={1} /> Connected
      </>
    ) : (
      <>
        <WarningIcon mr={1} /> Disconnected
      </>
    )}
  </Badge>
);

// Exchange Type Badge
const ExchangeTypeBadge = ({ isTestnet }: { isTestnet: boolean }) => (
  <Badge 
    colorScheme={isTestnet ? 'purple' : 'blue'} 
    px={2}
    py={1}
    borderRadius="full"
  >
    {isTestnet ? 'Testnet' : 'Mainnet'}
  </Badge>
);

interface ExchangeConnectionProps {
  name: string;
  isConnected: boolean;
  isTestnet: boolean;
  lastChecked: string;
  hasCredentials: boolean;
}

interface ExchangeFormData {
  name: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  isTestnet: boolean;
  description: string;
}

const ExchangeConnectionsPanel: React.FC = () => {
  const [exchanges, setExchanges] = useState<ExchangeConnectionProps[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExchangeFormData>({
    name: '',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    isTestnet: false,
    description: ''
  });
  const [availableExchanges, setAvailableExchanges] = useState<string[]>([
    'binance', 'coinbase', 'ftx', 'kraken', 'kucoin', 'bybit'
  ]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);

  // UI State
  const { isOpen: isAddModalOpen, onOpen: onAddModalOpen, onClose: onAddModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  const toast = useToast();

  // ElizaOS Integration for exchange management
  const [elizaCommandInput, setElizaCommandInput] = useState<string>('');
  const [showElizaCommands, setShowElizaCommands] = useState<boolean>(false);

  useEffect(() => {
    loadExchangeData();
  }, []);

  const loadExchangeData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchExchangeStatus();
      const formattedExchanges = Object.entries(data).map(([name, details]: [string, any]) => ({
        name,
        isConnected: details.connected,
        isTestnet: details.testnet,
        lastChecked: new Date(details.last_check * 1000).toLocaleString(),
        hasCredentials: details.has_credentials
      }));
      setExchanges(formattedExchanges);
    } catch (error) {
      console.error('Failed to fetch exchange data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exchange connection data.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshExchangeStatus = async () => {
    try {
      setIsRefreshing(true);
      await loadExchangeData();
      toast({
        title: 'Success',
        description: 'Exchange connection status refreshed.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error refreshing exchange status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddExchange = () => {
    setFormData({
      name: '',
      apiKey: '',
      apiSecret: '',
      passphrase: '',
      isTestnet: false,
      description: ''
    });
    onAddModalOpen();
  };

  const handleEditExchange = (exchangeName: string) => {
    const exchange = exchanges.find(e => e.name === exchangeName);
    if (exchange) {
      setSelectedExchange(exchangeName);
      setFormData({
        name: exchangeName,
        apiKey: '',  // We don't load the existing API key for security
        apiSecret: '', // We don't load the existing API secret for security
        passphrase: '',
        isTestnet: exchange.isTestnet,
        description: `${exchangeName.charAt(0).toUpperCase() + exchangeName.slice(1)} API Key`
      });
      onEditModalOpen();
    }
  };

  const handleDeleteExchange = (exchangeName: string) => {
    setSelectedExchange(exchangeName);
    onDeleteModalOpen();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: target.checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleToggleTestnet = () => {
    setFormData({
      ...formData,
      isTestnet: !formData.isTestnet
    });
  };

  const handleTestConnection = async () => {
    if (!formData.apiKey || !formData.apiSecret) {
      toast({
        title: 'Validation Error',
        description: 'API Key and Secret are required to test connection.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsTestingConnection(true);
      
      const testResult = await testConnection({
        name: formData.name,
        apiKey: formData.apiKey,
        apiSecret: formData.apiSecret,
        passphrase: formData.passphrase,
        isTestnet: formData.isTestnet
      });

      if (testResult.success) {
        toast({
          title: 'Connection Successful',
          description: `Successfully connected to ${formData.name} ${formData.isTestnet ? 'testnet' : 'mainnet'}.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: testResult.message || 'Failed to connect to exchange.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while testing the connection.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmitExchange = async (isEdit: boolean = false) => {
    // Validate form inputs
    if (!formData.name || !formData.apiKey || !formData.apiSecret) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (isEdit && selectedExchange) {
        await updateExchange(selectedExchange, {
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          passphrase: formData.passphrase,
          isTestnet: formData.isTestnet,
          description: formData.description
        });
        
        toast({
          title: 'Exchange Updated',
          description: `${selectedExchange} API credentials updated successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        onEditModalClose();
      } else {
        await addExchange({
          name: formData.name,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          passphrase: formData.passphrase,
          isTestnet: formData.isTestnet,
          description: formData.description
        });
        
        toast({
          title: 'Exchange Added',
          description: `${formData.name} added successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        onAddModalClose();
      }
      
      // Refresh exchange data
      await loadExchangeData();
    } catch (error) {
      console.error('Error submitting exchange:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEdit ? 'update' : 'add'} exchange.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteExchange = async () => {
    if (!selectedExchange) return;
    
    try {
      setIsSubmitting(true);
      await deleteExchange(selectedExchange);
      
      toast({
        title: 'Exchange Deleted',
        description: `${selectedExchange} has been removed.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh exchange data
      await loadExchangeData();
      onDeleteModalClose();
    } catch (error) {
      console.error('Error deleting exchange:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete exchange.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitElizaCommand = async () => {
    if (!elizaCommandInput.trim()) return;

    try {
      toast({
        title: 'Processing Command',
        description: 'Sending command to ElizaOS...',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });

      // Here we would integrate with the ElizaOS system
      // This is a placeholder for the actual implementation
      setElizaCommandInput('');
      
      // Simulate a response
      setTimeout(() => {
        toast({
          title: 'ElizaOS Response',
          description: 'Command processed successfully. Refreshing exchange data.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        loadExchangeData();
      }, 2000);
    } catch (error) {
      console.error('Error processing ElizaOS command:', error);
      toast({
        title: 'Error',
        description: 'Failed to process ElizaOS command.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const suggestedElizaCommands = [
    'Check all exchange connections',
    'Enable testnet mode for Binance',
    'Show balance across all exchanges',
    'Generate exchange connection report',
    'Detect best API routing path'
  ];

  return (
    <AnimatedBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      p={5}
      shadow="md"
      bg="white"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Exchange Connections</Heading>
        <Flex>
          <Tooltip label="Refresh Connection Status">
            <IconButton
              aria-label="Refresh connections"
              icon={<RepeatIcon />}
              isLoading={isRefreshing}
              onClick={refreshExchangeStatus}
              mr={2}
            />
          </Tooltip>
          <Button 
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={handleAddExchange}
          >
            Add Exchange
          </Button>
        </Flex>
      </Flex>

      {isLoading ? (
        <Flex justify="center" align="center" height="200px">
          <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
        </Flex>
      ) : exchanges.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          No exchange connections configured. Click "Add Exchange" to connect to a trading platform.
        </Alert>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Exchange</Th>
              <Th>Status</Th>
              <Th>Type</Th>
              <Th>Last Checked</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {exchanges.map((exchange) => (
              <Tr key={exchange.name}>
                <Td>
                  <Flex align="center">
                    <img 
                      src={`/assets/exchanges/${exchange.name.toLowerCase()}.svg`} 
                      alt={exchange.name}
                      style={{ width: '24px', height: '24px', marginRight: '8px' }}
                      onError={(e) => {
                        // Fallback if image doesn't exist
                        e.currentTarget.src = '/assets/exchanges/default.svg';
                      }}
                    />
                    <Text fontWeight="bold" textTransform="capitalize">
                      {exchange.name}
                    </Text>
                  </Flex>
                </Td>
                <Td>
                  <StatusBadge isConnected={exchange.isConnected} />
                </Td>
                <Td>
                  <ExchangeTypeBadge isTestnet={exchange.isTestnet} />
                </Td>
                <Td>{exchange.lastChecked}</Td>
                <Td>
                  <Flex>
                    <Tooltip label="Edit Connection">
                      <IconButton
                        aria-label="Edit connection"
                        icon={<EditIcon />}
                        size="sm"
                        mr={2}
                        onClick={() => handleEditExchange(exchange.name)}
                      />
                    </Tooltip>
                    <Tooltip label="Delete Connection">
                      <IconButton
                        aria-label="Delete connection"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDeleteExchange(exchange.name)}
                      />
                    </Tooltip>
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* ElizaOS Integration Section */}
      <Box mt={6} borderTop="1px solid" borderColor="gray.200" pt={4}>
        <Flex justifyContent="space-between" alignItems="center" mb={3}>
          <Heading size="sm">ElizaOS Exchange Management</Heading>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowElizaCommands(!showElizaCommands)}
          >
            {showElizaCommands ? 'Hide Suggestions' : 'Show Suggestions'}
          </Button>
        </Flex>
        
        {showElizaCommands && (
          <Box mb={3} p={3} bg="gray.50" borderRadius="md">
            <Text fontSize="sm" fontWeight="bold" mb={2}>Suggested Commands:</Text>
            <Flex flexWrap="wrap" gap={2}>
              {suggestedElizaCommands.map((cmd, index) => (
                <Badge 
                  key={index} 
                  px={2} 
                  py={1} 
                  colorScheme="purple" 
                  cursor="pointer"
                  onClick={() => setElizaCommandInput(cmd)}
                >
                  {cmd}
                </Badge>
              ))}
            </Flex>
          </Box>
        )}
        
        <Flex>
          <Input
            placeholder="Enter command for ElizaOS exchange management..."
            value={elizaCommandInput}
            onChange={(e) => setElizaCommandInput(e.target.value)}
            mr={2}
          />
          <Button onClick={handleSubmitElizaCommand}>Send</Button>
        </Flex>
        <Text fontSize="xs" mt={1} color="gray.500">
          Example: "Check all exchange connections" or "Enable testnet mode for Binance"
        </Text>
      </Box>

      {/* Add Exchange Modal */}
      <Modal isOpen={isAddModalOpen} onClose={onAddModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Exchange Connection</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Exchange</FormLabel>
              <Select 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange}
                placeholder="Select exchange"
              >
                {availableExchanges.map(exchange => (
                  <option key={exchange} value={exchange}>
                    {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>API Key</FormLabel>
              <Input 
                name="apiKey" 
                value={formData.apiKey} 
                onChange={handleInputChange}
                placeholder="Enter API key"
              />
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>API Secret</FormLabel>
              <Input 
                name="apiSecret" 
                type="password"
                value={formData.apiSecret} 
                onChange={handleInputChange}
                placeholder="Enter API secret"
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Passphrase</FormLabel>
              <Input 
                name="passphrase" 
                type="password"
                value={formData.passphrase || ''} 
                onChange={handleInputChange}
                placeholder="Enter passphrase (if required)"
              />
              <FormHelperText>Required for some exchanges like Coinbase and KuCoin</FormHelperText>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Input 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange}
                placeholder="Enter a description for this API key"
              />
            </FormControl>

            <FormControl display="flex" alignItems="center" mb={4}>
              <FormLabel mb="0">Use Testnet</FormLabel>
              <Switch 
                isChecked={formData.isTestnet}
                onChange={handleToggleTestnet}
              />
              <FormHelperText ml={2}>
                Testnet is for testing only and uses simulated funds
              </FormHelperText>
            </FormControl>

            <Button 
              colorScheme="teal" 
              width="full"
              onClick={handleTestConnection}
              isLoading={isTestingConnection}
              mb={4}
            >
              Test Connection
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddModalClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={() => handleSubmitExchange(false)}
              isLoading={isSubmitting}
            >
              Add Exchange
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Exchange Modal */}
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Exchange Connection</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isDisabled>
              <FormLabel>Exchange</FormLabel>
              <Input 
                value={formData.name} 
                isReadOnly
                textTransform="capitalize"
              />
            </FormControl>

            <Alert status="info" mb={4}>
              <AlertIcon />
              Enter new API credentials. Existing credentials will be replaced.
            </Alert>

            <FormControl mb={4} isRequired>
              <FormLabel>API Key</FormLabel>
              <Input 
                name="apiKey" 
                value={formData.apiKey} 
                onChange={handleInputChange}
                placeholder="Enter new API key"
              />
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>API Secret</FormLabel>
              <Input 
                name="apiSecret" 
                type="password"
                value={formData.apiSecret} 
                onChange={handleInputChange}
                placeholder="Enter new API secret"
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Passphrase</FormLabel>
              <Input 
                name="passphrase" 
                type="password"
                value={formData.passphrase || ''} 
                onChange={handleInputChange}
                placeholder="Enter new passphrase (if required)"
              />
              <FormHelperText>Required for some exchanges like Coinbase and KuCoin</FormHelperText>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Input 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange}
                placeholder="Enter a description for this API key"
              />
            </FormControl>

            <FormControl display="flex" alignItems="center" mb={4}>
              <FormLabel mb="0">Use Testnet</FormLabel>
              <Switch 
                isChecked={formData.isTestnet}
                onChange={handleToggleTestnet}
              />
              <FormHelperText ml={2}>
                Testnet is for testing only and uses simulated funds
              </FormHelperText>
            </FormControl>

            <Button 
              colorScheme="teal" 
              width="full"
              onClick={handleTestConnection}
              isLoading={isTestingConnection}
              mb={4}
            >
              Test Connection
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditModalClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={() => handleSubmitExchange(true)}
              isLoading={isSubmitting}
            >
              Update Exchange
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Exchange Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={onDeleteModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Exchange Connection</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning">
              <AlertIcon />
              Are you sure you want to delete the connection to {selectedExchange}? This action cannot be undone.
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteModalClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="red" 
              onClick={confirmDeleteExchange}
              isLoading={isSubmitting}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AnimatedBox>
  );
};

export default ExchangeConnectionsPanel;
